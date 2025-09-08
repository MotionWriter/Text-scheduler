import { cronJobs } from "convex/server";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const crons = cronJobs();

// Run every minute to check for messages that need to be processed
crons.interval(
  "process scheduled messages",
  { minutes: 1 },
  internal.messageScheduler.processScheduledMessages
);

// Run every hour to retry failed messages
crons.interval(
  "retry failed messages", 
  { hours: 1 },
  internal.messageScheduler.retryFailedMessages
);

// Internal function to process scheduled messages due for delivery
export const processScheduledMessages = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    console.log(`[MessageScheduler] Processing scheduled messages at ${new Date(now).toISOString()}`);
    
    // Get all messages scheduled for delivery that haven't been processed yet
    const dueMessages = await ctx.db
      .query("userSelectedMessages")
      .withIndex("by_scheduled_time")
      .filter(q => 
        q.and(
          q.eq(q.field("isScheduled"), true),
          q.lte(q.field("scheduledAt"), now),
          q.or(
            q.eq(q.field("deliveryStatus"), undefined),
            q.eq(q.field("deliveryStatus"), "pending")
          )
        )
      )
      .take(50); // Process in batches to avoid overwhelming the system

    console.log(`[MessageScheduler] Found ${dueMessages.length} messages due for delivery`);

    for (const message of dueMessages) {
      try {
        // Mark as pending and increment delivery attempts
        await ctx.db.patch(message._id, {
          deliveryStatus: "pending",
          deliveryAttempts: (message.deliveryAttempts || 0) + 1,
          lastDeliveryAttempt: now
        });

        // Schedule the actual message delivery
        await ctx.scheduler.runAfter(0, internal.smsDelivery.sendScheduledMessage, {
          messageId: message._id
        });

        console.log(`[MessageScheduler] Queued message ${message._id} for delivery`);
      } catch (error) {
        console.error(`[MessageScheduler] Failed to queue message ${message._id}:`, error);
        
        // Mark as failed if we can't even queue it
        await ctx.db.patch(message._id, {
          deliveryStatus: "failed",
          deliveryError: `Failed to queue message: ${error}`,
          lastDeliveryAttempt: now
        });
      }
    }
  }
});

// Internal function to retry failed messages with intelligent backoff
export const retryFailedMessages = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    console.log(`[MessageScheduler] Checking for failed messages to retry at ${new Date(now).toISOString()}`);

    // Get failed messages that are eligible for retry
    const failedMessages = await ctx.db
      .query("userSelectedMessages")
      .withIndex("by_delivery_status", q => q.eq("deliveryStatus", "failed"))
      .filter(q => 
        q.and(
          q.lt(q.field("deliveryAttempts"), 3), // Max 3 attempts
          q.gt(q.field("lastDeliveryAttempt"), oneDayAgo), // Only retry messages from last 24h
          q.lt(q.field("lastDeliveryAttempt"), oneHourAgo) // Wait at least 1 hour between retries
        )
      )
      .take(25); // Limit retries per run

    console.log(`[MessageScheduler] Found ${failedMessages.length} failed messages eligible for retry`);

    for (const message of failedMessages) {
      try {
        // Update retry tracking
        await ctx.db.patch(message._id, {
          deliveryStatus: "pending",
          deliveryAttempts: (message.deliveryAttempts || 0) + 1,
          lastDeliveryAttempt: now,
          deliveryError: undefined // Clear previous error
        });

        // Schedule the retry
        await ctx.scheduler.runAfter(0, internal.smsDelivery.sendScheduledMessage, {
          messageId: message._id
        });

        console.log(`[MessageScheduler] Queued retry for message ${message._id} (attempt ${message.deliveryAttempts || 0 + 1})`);
      } catch (error) {
        console.error(`[MessageScheduler] Failed to queue retry for message ${message._id}:`, error);
      }
    }
  }
});

// Function to reschedule a specific failed message (called by admin)
export const rescheduleFailedMessage = internalMutation({
  args: {
    messageId: v.id("userSelectedMessages"),
    newScheduledAt: v.number()
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    
    if (!message) {
      throw new Error("Message not found");
    }

    await ctx.db.patch(args.messageId, {
      scheduledAt: args.newScheduledAt,
      deliveryStatus: undefined, // Reset status
      deliveryAttempts: 0,
      lastDeliveryAttempt: undefined,
      deliveryError: undefined
    });

    console.log(`[MessageScheduler] Rescheduled message ${args.messageId} for ${new Date(args.newScheduledAt).toISOString()}`);
  }
});

// Query to get delivery statistics for monitoring
export const getDeliveryStats = internalQuery({
  args: {
    timeRangeHours: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const timeRangeMs = (args.timeRangeHours || 24) * 60 * 60 * 1000;
    const cutoffTime = Date.now() - timeRangeMs;

    // Get all messages within time range
    const allMessages = await ctx.db
      .query("userSelectedMessages")
      .filter(q => 
        q.and(
          q.eq(q.field("isScheduled"), true),
          q.gt(q.field("scheduledAt"), cutoffTime)
        )
      )
      .collect();

    const stats = {
      total: allMessages.length,
      pending: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
      unprocessed: 0
    };

    for (const message of allMessages) {
      switch (message.deliveryStatus) {
        case "pending":
          stats.pending++;
          break;
        case "sent":
          stats.sent++;
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

    return {
      ...stats,
      successRate: stats.total > 0 ? (stats.sent / stats.total) * 100 : 0,
      timeRangeHours: args.timeRangeHours || 24
    };
  }
});

export default crons;