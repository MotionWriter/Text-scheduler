import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./_lib/userAuth";

// Get user's custom messages for a specific lesson
export const getForLesson = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    return await ctx.db
      .query("userCustomMessages")
      .withIndex("by_user_lesson", q => q.eq("userId", user._id).eq("lessonId", args.lessonId))
      .collect();
  },
});

// Get all custom messages for a user
export const getAll = query({
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    
    return await ctx.db
      .query("userCustomMessages")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();
  },
});

// Get custom message count for a lesson (for limit checking)
export const getCountForLesson = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    const messages = await ctx.db
      .query("userCustomMessages")
      .withIndex("by_user_lesson", q => q.eq("userId", user._id).eq("lessonId", args.lessonId))
      .collect();
    
    return {
      count: messages.length,
      remaining: Math.max(0, 2 - messages.length),
      canCreate: messages.length < 2,
    };
  },
});

// Create custom message with validation
export const create = mutation({
  args: {
    lessonId: v.id("lessons"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    // Validate character limit
    if (args.content.length > 280) {
      throw new Error("Custom messages cannot exceed 280 characters");
    }
    
    if (args.content.trim().length === 0) {
      throw new Error("Message content cannot be empty");
    }
    
    // Check lesson exists
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson) {
      throw new Error("Lesson not found");
    }
    
    // Check user's existing custom message count for this lesson
    const existingMessages = await ctx.db
      .query("userCustomMessages")
      .withIndex("by_user_lesson", q => q.eq("userId", user._id).eq("lessonId", args.lessonId))
      .collect();
    
    if (existingMessages.length >= 2) {
      throw new Error("Maximum 2 custom messages allowed per lesson");
    }
    
    return await ctx.db.insert("userCustomMessages", {
      userId: user._id,
      lessonId: args.lessonId,
      content: args.content.trim(),
      createdAt: Date.now(),
      lastModified: Date.now(),
    });
  },
});

// Update custom message
export const update = mutation({
  args: {
    id: v.id("userCustomMessages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    // Validate character limit
    if (args.content.length > 280) {
      throw new Error("Custom messages cannot exceed 280 characters");
    }
    
    if (args.content.trim().length === 0) {
      throw new Error("Message content cannot be empty");
    }
    
    // Verify ownership
    const message = await ctx.db.get(args.id);
    if (!message || message.userId !== user._id) {
      throw new Error("Custom message not found or access denied");
    }
    
    return await ctx.db.patch(args.id, {
      content: args.content.trim(),
      lastModified: Date.now(),
    });
  },
});

// Delete custom message
export const remove = mutation({
  args: { id: v.id("userCustomMessages") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    // Verify ownership
    const message = await ctx.db.get(args.id);
    if (!message || message.userId !== user._id) {
      throw new Error("Custom message not found or access denied");
    }
    
    // Remove from any user selections first
    const selections = await ctx.db
      .query("userSelectedMessages")
      .filter(q => q.eq(q.field("customMessageId"), args.id))
      .collect();
    
    for (const selection of selections) {
      await ctx.db.delete(selection._id);
    }
    
    await ctx.db.delete(args.id);
  },
});