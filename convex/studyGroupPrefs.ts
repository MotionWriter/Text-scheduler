import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getForStudy = query({
  args: { studyBookId: v.id("studyBooks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const pref = await ctx.db
      .query("studyGroupPreferences")
      .withIndex("by_user_study", (q) => q.eq("userId", userId).eq("studyBookId", args.studyBookId))
      .first();

    return pref || null;
  },
});

export const setForStudy = mutation({
  args: { studyBookId: v.id("studyBooks"), groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const group = await ctx.db.get(args.groupId);
    if (!group || group.userId !== userId) throw new Error("Group not found or access denied");

    const existing = await ctx.db
      .query("studyGroupPreferences")
      .withIndex("by_user_study", (q) => q.eq("userId", userId).eq("studyBookId", args.studyBookId))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { groupId: args.groupId, updatedAt: now });
      return existing._id;
    } else {
      return await ctx.db.insert("studyGroupPreferences", {
        userId,
        studyBookId: args.studyBookId,
        groupId: args.groupId,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const clearForStudy = mutation({
  args: { studyBookId: v.id("studyBooks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("studyGroupPreferences")
      .withIndex("by_user_study", (q) => q.eq("userId", userId).eq("studyBookId", args.studyBookId))
      .first();

    if (existing) await ctx.db.delete(existing._id);
  },
});

