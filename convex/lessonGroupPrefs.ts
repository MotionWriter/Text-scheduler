import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getForLesson = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const pref = await ctx.db
      .query("lessonGroupPreferences")
      .withIndex("by_user_lesson", (q) => q.eq("userId", userId).eq("lessonId", args.lessonId))
      .first();

    return pref || null;
  },
});

export const setForLesson = mutation({
  args: { lessonId: v.id("lessons"), groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify group belongs to user
    const group = await ctx.db.get(args.groupId);
    if (!group || group.userId !== userId) throw new Error("Group not found or access denied");

    const existing = await ctx.db
      .query("lessonGroupPreferences")
      .withIndex("by_user_lesson", (q) => q.eq("userId", userId).eq("lessonId", args.lessonId))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { groupId: args.groupId, updatedAt: now });
      return existing._id;
    } else {
      return await ctx.db.insert("lessonGroupPreferences", {
        userId,
        lessonId: args.lessonId,
        groupId: args.groupId,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const clearForLesson = mutation({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("lessonGroupPreferences")
      .withIndex("by_user_lesson", (q) => q.eq("userId", userId).eq("lessonId", args.lessonId))
      .first();

    if (existing) await ctx.db.delete(existing._id);
  },
});

