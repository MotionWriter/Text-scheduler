import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./_lib/adminAuth";

// List all active study books (public read access for users)
export const list = query({
  handler: async (ctx) => {
    // Return only active study books for regular users
    return await ctx.db
      .query("studyBooks")
      .filter(q => q.eq(q.field("isActive"), true))
      .order("desc")
      .collect();
  },
});

// Get single study book by ID
export const get = query({
  args: { id: v.id("studyBooks") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.id);
  },
});

// Create new study book
export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    totalLessons: v.number(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    
    return await ctx.db.insert("studyBooks", {
      title: args.title,
      description: args.description,
      totalLessons: args.totalLessons,
      createdBy: admin._id,
      createdAt: Date.now(),
      isActive: true,
    });
  },
});

// Update study book
export const update = mutation({
  args: {
    id: v.id("studyBooks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    totalLessons: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const { id, ...updates } = args;
    const updateData: any = {};
    
    // Only include provided fields
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.totalLessons !== undefined) updateData.totalLessons = updates.totalLessons;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    
    return await ctx.db.patch(id, updateData);
  },
});

// Delete study book (and all related lessons/messages)
export const remove = mutation({
  args: { id: v.id("studyBooks") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    // Get all lessons for this study book
    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_study_book", q => q.eq("studyBookId", args.id))
      .collect();
    
    // Delete all predefined messages for all lessons
    for (const lesson of lessons) {
      const messages = await ctx.db
        .query("predefinedMessages")
        .withIndex("by_lesson", q => q.eq("lessonId", lesson._id))
        .collect();
      
      for (const message of messages) {
        await ctx.db.delete(message._id);
      }
      
      await ctx.db.delete(lesson._id);
    }
    
    // Finally delete the study book
    await ctx.db.delete(args.id);
  },
});