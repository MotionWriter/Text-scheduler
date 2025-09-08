import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("messageTemplates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.insert("messageTemplates", {
      userId,
      name: args.name,
      content: args.content,
      category: args.category,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("messageTemplates"),
    name: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const template = await ctx.db.get(args.id);
    if (!template || template.userId !== userId) {
      throw new Error("Template not found or access denied");
    }

    await ctx.db.patch(args.id, {
      name: args.name,
      content: args.content,
      category: args.category,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("messageTemplates") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const template = await ctx.db.get(args.id);
    if (!template || template.userId !== userId) {
      throw new Error("Template not found or access denied");
    }

    await ctx.db.delete(args.id);
  },
});
