import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./_lib/adminAuth";

// List lessons for a study book
export const listByStudyBook = query({
  args: { studyBookId: v.id("studyBooks") },
  handler: async (ctx, args) => {
    // Public read access - users need to see lessons
    return await ctx.db
      .query("lessons")
      .withIndex("by_study_book_number", q => q.eq("studyBookId", args.studyBookId))
      .order("asc") // Order by lesson number
      .collect();
  },
});

// Get single lesson by ID
export const get = query({
  args: { id: v.id("lessons") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create new lesson (admin only)
export const create = mutation({
  args: {
    studyBookId: v.id("studyBooks"),
    lessonNumber: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    // Verify study book exists
    const studyBook = await ctx.db.get(args.studyBookId);
    if (!studyBook) {
      throw new Error("Study book not found");
    }
    
    // Check if lesson number already exists
    const existingLesson = await ctx.db
      .query("lessons")
      .withIndex("by_study_book_number", q => 
        q.eq("studyBookId", args.studyBookId).eq("lessonNumber", args.lessonNumber)
      )
      .first();
    
    if (existingLesson) {
      throw new Error(`Lesson ${args.lessonNumber} already exists for this study book`);
    }
    
    return await ctx.db.insert("lessons", {
      studyBookId: args.studyBookId,
      lessonNumber: args.lessonNumber,
      title: args.title,
      description: args.description,
      createdAt: Date.now(),
      isActive: true,
    });
  },
});

// Update lesson (admin only)
export const update = mutation({
  args: {
    id: v.id("lessons"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const { id, ...updates } = args;
    const updateData: any = {};
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    
    return await ctx.db.patch(id, updateData);
  },
});

// Delete lesson (admin only)
export const remove = mutation({
  args: { id: v.id("lessons") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    // Delete all predefined messages for this lesson
    const messages = await ctx.db
      .query("predefinedMessages")
      .withIndex("by_lesson", q => q.eq("lessonId", args.id))
      .collect();
    
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
    
    await ctx.db.delete(args.id);
  },
});