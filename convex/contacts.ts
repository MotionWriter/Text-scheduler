import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

function normalizeUsDigits(value: string) {
  let d = String(value).replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("contacts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    phoneNumber: v.string(),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const normalized = normalizeUsDigits(args.phoneNumber);
    if (normalized.length !== 10) {
      throw new Error("Invalid US phone number (expect 10 digits; +1 prefix accepted)");
    }

    return await ctx.db.insert("contacts", {
      userId,
      name: args.name,
      phoneNumber: normalized,
      email: args.email,
      notes: args.notes,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("contacts"),
    name: v.string(),
    phoneNumber: v.string(),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const contact = await ctx.db.get(args.id);
    if (!contact || contact.userId !== userId) {
      throw new Error("Contact not found or access denied");
    }

    const normalized = normalizeUsDigits(args.phoneNumber);
    if (normalized.length !== 10) {
      throw new Error("Invalid US phone number (expect 10 digits; +1 prefix accepted)");
    }

    await ctx.db.patch(args.id, {
      name: args.name,
      phoneNumber: normalized,
      email: args.email,
      notes: args.notes,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const contact = await ctx.db.get(args.id);
    if (!contact || contact.userId !== userId) {
      throw new Error("Contact not found or access denied");
    }

    await ctx.db.delete(args.id);
  },
});
