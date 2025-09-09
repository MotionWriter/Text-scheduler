import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./_lib/adminAuth";

// List predefined messages for a lesson
export const listByLesson = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    // Public read access - users need to see predefined messages
    return await ctx.db
      .query("predefinedMessages")
      .withIndex("by_lesson_order", q => q.eq("lessonId", args.lessonId))
      .filter(q => q.eq(q.field("isActive"), true))
      .order("asc") // Order by displayOrder
      .collect();
  },
});

// List predefined messages for all lessons in a study book
export const listByStudyBook = query({
  args: { studyBookId: v.id("studyBooks") },
  handler: async (ctx, args) => {
    // Fetch lessons for the study book
    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_study_book", q => q.eq("studyBookId", args.studyBookId))
      .collect();

    const lessonIds = new Set(lessons.map(l => l._id));

    // Fetch messages per lesson and flatten
    const byLesson: any[] = [];
    for (const lesson of lessons) {
      const msgs = await ctx.db
        .query("predefinedMessages")
        .withIndex("by_lesson_order", q => q.eq("lessonId", lesson._id))
        .filter(q => q.eq(q.field("isActive"), true))
        .order("asc")
        .collect();
      byLesson.push(...msgs.map(m => ({ ...m, lesson })));
    }

    return byLesson;
  },
});

// Get single predefined message
export const get = query({
  args: { id: v.id("predefinedMessages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create predefined message (admin only)
export const create = mutation({
  args: {
    lessonId: v.id("lessons"),
    content: v.string(),
    messageType: v.string(),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    
    // Verify lesson exists
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson) {
      throw new Error("Lesson not found");
    }
    
    // Auto-assign display order if not provided
    let displayOrder = args.displayOrder;
    if (displayOrder === undefined) {
      const existingMessages = await ctx.db
        .query("predefinedMessages")
        .withIndex("by_lesson", q => q.eq("lessonId", args.lessonId))
        .collect();
      displayOrder = existingMessages.length + 1;
    }
    
    return await ctx.db.insert("predefinedMessages", {
      lessonId: args.lessonId,
      content: args.content,
      messageType: args.messageType,
      displayOrder,
      createdBy: admin._id,
      createdAt: Date.now(),
      isActive: true,
    });
  },
});

// Update predefined message (admin only)
export const update = mutation({
  args: {
    id: v.id("predefinedMessages"),
    content: v.optional(v.string()),
    messageType: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const { id, ...updates } = args;
    const updateData: any = {};
    
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.messageType !== undefined) updateData.messageType = updates.messageType;
    if (updates.displayOrder !== undefined) updateData.displayOrder = updates.displayOrder;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    
    return await ctx.db.patch(id, updateData);
  },
});

// Delete predefined message (admin only)
export const remove = mutation({
  args: { id: v.id("predefinedMessages") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

// Reorder predefined messages within a lesson
export const reorder = mutation({
  args: {
    lessonId: v.id("lessons"),
    messageIds: v.array(v.id("predefinedMessages")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    // Update display order for each message
    for (let i = 0; i < args.messageIds.length; i++) {
      await ctx.db.patch(args.messageIds[i], {
        displayOrder: i + 1,
      });
    }
  },
});