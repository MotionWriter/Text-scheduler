import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./_lib/userAuth";

// Get user's selected messages for a lesson
export const getForLesson = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    const selections = await ctx.db
      .query("userSelectedMessages")
      .withIndex("by_user_lesson", q => q.eq("userId", user._id).eq("lessonId", args.lessonId))
      .collect();
    
    // Enhance with actual message content
    const enhancedSelections = await Promise.all(
      selections.map(async (selection) => {
        let messageContent = null;
        let messageType = "custom";
        
        if (selection.predefinedMessageId) {
          const predefinedMessage = await ctx.db.get(selection.predefinedMessageId);
          if (predefinedMessage) {
            messageContent = predefinedMessage.content;
            messageType = "predefined";
          }
        } else if (selection.customMessageId) {
          const customMessage = await ctx.db.get(selection.customMessageId);
          if (customMessage) {
            messageContent = customMessage.content;
            messageType = "custom";
          }
        }
        
        return {
          ...selection,
          messageContent,
          messageType,
        };
      })
    );
    
    return enhancedSelections;
  },
});

// Get all scheduled messages for user
export const getScheduled = query({
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    
    return await ctx.db
      .query("userSelectedMessages")
      .withIndex("by_user_scheduled", q => q.eq("userId", user._id).eq("isScheduled", true))
      .collect();
  },
});

// Select a predefined message
export const selectPredefined = mutation({
  args: {
    predefinedMessageId: v.id("predefinedMessages"),
    scheduledAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    // Verify predefined message exists
    const predefinedMessage = await ctx.db.get(args.predefinedMessageId);
    if (!predefinedMessage) {
      throw new Error("Predefined message not found");
    }
    
    // Check if user already selected this message
    const existingSelection = await ctx.db
      .query("userSelectedMessages")
      .filter(q => 
        q.and(
          q.eq(q.field("userId"), user._id),
          q.eq(q.field("predefinedMessageId"), args.predefinedMessageId)
        )
      )
      .first();
    
    if (existingSelection) {
      throw new Error("You have already selected this predefined message");
    }
    
    return await ctx.db.insert("userSelectedMessages", {
      userId: user._id,
      predefinedMessageId: args.predefinedMessageId,
      customMessageId: undefined,
      lessonId: predefinedMessage.lessonId,
      scheduledAt: args.scheduledAt,
      isScheduled: !!args.scheduledAt,
      createdAt: Date.now(),
    });
  },
});

// Select a custom message
export const selectCustom = mutation({
  args: {
    customMessageId: v.id("userCustomMessages"),
    scheduledAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    // Verify custom message exists and belongs to user
    const customMessage = await ctx.db.get(args.customMessageId);
    if (!customMessage || customMessage.userId !== user._id) {
      throw new Error("Custom message not found or access denied");
    }
    
    // Check if user already selected this message
    const existingSelection = await ctx.db
      .query("userSelectedMessages")
      .filter(q => 
        q.and(
          q.eq(q.field("userId"), user._id),
          q.eq(q.field("customMessageId"), args.customMessageId)
        )
      )
      .first();
    
    if (existingSelection) {
      throw new Error("You have already selected this custom message");
    }
    
    return await ctx.db.insert("userSelectedMessages", {
      userId: user._id,
      predefinedMessageId: undefined,
      customMessageId: args.customMessageId,
      lessonId: customMessage.lessonId,
      scheduledAt: args.scheduledAt,
      isScheduled: !!args.scheduledAt,
      createdAt: Date.now(),
    });
  },
});

// Update selection scheduling
export const updateScheduling = mutation({
  args: {
    id: v.id("userSelectedMessages"),
    scheduledAt: v.optional(v.number()),
    isScheduled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    // Verify ownership
    const selection = await ctx.db.get(args.id);
    if (!selection || selection.userId !== user._id) {
      throw new Error("Message selection not found or access denied");
    }
    
    return await ctx.db.patch(args.id, {
      scheduledAt: args.scheduledAt,
      isScheduled: args.isScheduled,
    });
  },
});

// Remove message selection
export const remove = mutation({
  args: { id: v.id("userSelectedMessages") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    // Verify ownership
    const selection = await ctx.db.get(args.id);
    if (!selection || selection.userId !== user._id) {
      throw new Error("Message selection not found or access denied");
    }
    
    await ctx.db.delete(args.id);
  },
});