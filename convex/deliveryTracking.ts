import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./_lib/userAuth";
import { requireAdmin } from "./_lib/adminAuth";
import { Id } from "./_generated/dataModel";

// User query to get their delivery history
export const getUserDeliveryHistory = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("cancelled")
    ))
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const limit = args.limit || 50;

    let query = ctx.db
      .query("userSelectedMessages")
      .withIndex("by_user_scheduled", q => 
        q.eq("userId", user._id).eq("isScheduled", true)
      );

    if (args.status) {
      query = query.filter(q => q.eq(q.field("deliveryStatus"), args.status));
    }

    const messages = await query
      .order("desc")
      .take(limit);

    // Enhance with message content and lesson details
    const enhancedHistory = await Promise.all(
      messages.map(async (message) => {
        let messageContent = "";
        let messageType = "custom";

        if (message.predefinedMessageId) {
          const predefinedMessage = await ctx.db.get(message.predefinedMessageId);
          if (predefinedMessage) {
            messageContent = predefinedMessage.content;
            messageType = predefinedMessage.messageType;
          }
        } else if (message.customMessageId) {
          const customMessage = await ctx.db.get(message.customMessageId);
          if (customMessage) {
            messageContent = customMessage.content;
            messageType = "custom";
          }
        }

        const lesson = await ctx.db.get(message.lessonId);
        const lessonTitle = lesson?.title || "Unknown Lesson";

        return {
          ...message,
          messageContent,
          messageType,
          lessonTitle,
          deliveryStatus: message.deliveryStatus || "unprocessed"
        };
      })
    );

    return enhancedHistory;
  }
});

// User query to get delivery statistics
export const getUserDeliveryStats = query({
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const userMessages = await ctx.db
      .query("userSelectedMessages")
      .withIndex("by_user_scheduled", q => 
        q.eq("userId", user._id).eq("isScheduled", true)
      )
      .collect();

    const stats = {
      total: userMessages.length,
      pending: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
      unprocessed: 0,
      avgDeliveryTime: 0
    };

    let totalDeliveryDelay = 0;
    let sentCount = 0;

    for (const message of userMessages) {
      switch (message.deliveryStatus) {
        case "pending":
          stats.pending++;
          break;
        case "sent":
          stats.sent++;
          if (message.actualDeliveryTime && message.scheduledAt) {
            totalDeliveryDelay += message.actualDeliveryTime - message.scheduledAt;
            sentCount++;
          }
          break;
        case "failed":
          stats.failed++;
          break;
        case "cancelled":
          stats.cancelled++;
          break;
        default:
          stats.unprocessed++;
      }
    }

    // Calculate average delivery delay in minutes
    stats.avgDeliveryTime = sentCount > 0 ? Math.round(totalDeliveryDelay / sentCount / 1000 / 60) : 0;

    return {
      ...stats,
      successRate: stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0
    };
  }
});

// Admin query to get system-wide delivery statistics
export const getSystemDeliveryStats = query({
  args: {
    timeRangeHours: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const timeRangeMs = (args.timeRangeHours || 24) * 60 * 60 * 1000;
    const cutoffTime = Date.now() - timeRangeMs;

    const recentMessages = await ctx.db
      .query("userSelectedMessages")
      .withIndex("by_scheduled_time")
      .filter(q => 
        q.and(
          q.eq(q.field("isScheduled"), true),
          q.gt(q.field("scheduledAt"), cutoffTime)
        )
      )
      .collect();

    const stats = {
      total: recentMessages.length,
      pending: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
      unprocessed: 0,
      avgDeliveryTime: 0,
      failedMessages: [] as any[]
    };

    let totalDeliveryDelay = 0;
    let sentCount = 0;

    for (const message of recentMessages) {
      switch (message.deliveryStatus) {
        case "pending":
          stats.pending++;
          break;
        case "sent":
          stats.sent++;
          if (message.actualDeliveryTime && message.scheduledAt) {
            totalDeliveryDelay += message.actualDeliveryTime - message.scheduledAt;
            sentCount++;
          }
          break;
        case "failed":
          stats.failed++;
          // Add to failed messages list for admin review
          stats.failedMessages.push({
            id: message._id,
            userId: message.userId,
            error: message.deliveryError,
            attempts: message.deliveryAttempts,
            lastAttempt: message.lastDeliveryAttempt
          });
          break;
        case "cancelled":
          stats.cancelled++;
          break;
        default:
          stats.unprocessed++;
      }
    }

    stats.avgDeliveryTime = sentCount > 0 ? Math.round(totalDeliveryDelay / sentCount / 1000 / 60) : 0;

    return {
      ...stats,
      successRate: stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0,
      timeRangeHours: args.timeRangeHours || 24
    };
  }
});

// Admin query to get failed messages for review
export const getFailedMessages = query({
  args: {
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const failedMessages = await ctx.db
      .query("userSelectedMessages")
      .withIndex("by_delivery_status", q => q.eq("deliveryStatus", "failed"))
      .order("desc")
      .take(args.limit || 50);

    // Enhance with user and message details
    const enhancedFailures = await Promise.all(
      failedMessages.map(async (message) => {
        const user = await ctx.db.get(message.userId);
        const lesson = await ctx.db.get(message.lessonId);
        
        let messageContent = "";
        if (message.predefinedMessageId) {
          const predefinedMessage = await ctx.db.get(message.predefinedMessageId);
          messageContent = predefinedMessage?.content || "";
        } else if (message.customMessageId) {
          const customMessage = await ctx.db.get(message.customMessageId);
          messageContent = customMessage?.content || "";
        }

        return {
          ...message,
          userName: user?.name || user?.email || "Unknown User",
          userPhone: user?.phone,
          lessonTitle: lesson?.title || "Unknown Lesson",
          messageContent: messageContent.substring(0, 100) + (messageContent.length > 100 ? "..." : ""),
          deliveryAttempts: message.deliveryAttempts || 0
        };
      })
    );

    return enhancedFailures;
  }
});

// Admin mutation to manually retry a failed message
export const retryFailedMessage = mutation({
  args: {
    messageId: v.id("userSelectedMessages"),
    newScheduledAt: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const message = await ctx.db.get(args.messageId);
    if (!message || message.deliveryStatus !== "failed") {
      throw new Error("Message not found or not in failed state");
    }

    const scheduleTime = args.newScheduledAt || Date.now();

    await ctx.db.patch(args.messageId, {
      scheduledAt: scheduleTime,
      deliveryStatus: undefined, // Reset to allow reprocessing
      deliveryAttempts: 0,
      lastDeliveryAttempt: undefined,
      deliveryError: undefined
    });

    return { success: true, rescheduledFor: scheduleTime };
  }
});

// Admin mutation to cancel a message
export const cancelMessage = mutation({
  args: {
    messageId: v.id("userSelectedMessages"),
    reason: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    await ctx.db.patch(args.messageId, {
      deliveryStatus: "cancelled",
      deliveryError: args.reason || "Cancelled by admin"
    });

    return { success: true };
  }
});

// User mutation to reschedule their own message
export const rescheduleMessage = mutation({
  args: {
    messageId: v.id("userSelectedMessages"),
    newScheduledAt: v.number()
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    const message = await ctx.db.get(args.messageId);
    if (!message || message.userId !== user._id) {
      throw new Error("Message not found or access denied");
    }

    // Only allow rescheduling of failed or unprocessed messages
    if (message.deliveryStatus === "sent") {
      throw new Error("Cannot reschedule a message that has already been sent");
    }

    await ctx.db.patch(args.messageId, {
      scheduledAt: args.newScheduledAt,
      deliveryStatus: undefined, // Reset status
      deliveryAttempts: 0,
      lastDeliveryAttempt: undefined,
      deliveryError: undefined
    });

    return { success: true, rescheduledFor: args.newScheduledAt };
  }
});

// Internal query for getting delivery metrics (used by cron jobs)
export const getDeliveryMetrics = internalQuery({
  args: {
    timeRangeHours: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const timeRangeMs = (args.timeRangeHours || 1) * 60 * 60 * 1000;
    const cutoffTime = Date.now() - timeRangeMs;

    const recentMessages = await ctx.db
      .query("userSelectedMessages")
      .withIndex("by_scheduled_time")
      .filter(q => 
        q.and(
          q.eq(q.field("isScheduled"), true),
          q.gt(q.field("scheduledAt"), cutoffTime)
        )
      )
      .collect();

    const metrics = {
      messagesProcessed: 0,
      messagesSucceeded: 0,
      messagesFailed: 0,
      averageProcessingTime: 0,
      errorRate: 0
    };

    let totalProcessingTime = 0;
    let processedCount = 0;

    for (const message of recentMessages) {
      if (message.deliveryStatus === "sent" || message.deliveryStatus === "failed") {
        metrics.messagesProcessed++;
        
        if (message.deliveryStatus === "sent") {
          metrics.messagesSucceeded++;
        } else {
          metrics.messagesFailed++;
        }

        if (message.lastDeliveryAttempt && message.scheduledAt) {
          totalProcessingTime += message.lastDeliveryAttempt - message.scheduledAt;
          processedCount++;
        }
      }
    }

    metrics.averageProcessingTime = processedCount > 0 ? 
      Math.round(totalProcessingTime / processedCount / 1000) : 0;
    
    metrics.errorRate = metrics.messagesProcessed > 0 ? 
      Math.round((metrics.messagesFailed / metrics.messagesProcessed) * 100) : 0;

    return metrics;
  }
});