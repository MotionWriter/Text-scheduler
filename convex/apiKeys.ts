import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Don't return the actual key hash for security
    return keys.map(({ keyHash, ...key }) => key);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Generate a random API key
    const apiKey = generateApiKey();
    const keyHash = await hashApiKey(apiKey);

    const keyId = await ctx.db.insert("apiKeys", {
      userId,
      keyHash,
      name: args.name,
      isActive: true,
    });

    // Return the plain API key only once during creation
    return { keyId, apiKey };
  },
});

// Rotate: create a new key that will replace an existing one after grace period
export const rotate = mutation({
  args: {
    fromKeyId: v.id("apiKeys"),
    name: v.optional(v.string()),
    gracePeriodMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const fromKey = await ctx.db.get(args.fromKeyId);
    if (!fromKey || fromKey.userId !== userId) {
      throw new Error("API key not found or access denied");
    }

    const apiKey = generateApiKey();
    const keyHash = await hashApiKey(apiKey);
    const graceMs = args.gracePeriodMs ?? 24 * 60 * 60 * 1000; // default 24h
    const now = Date.now();

    const newKeyId = await ctx.db.insert("apiKeys", {
      userId,
      keyHash,
      name: args.name ?? `Rotated ${new Date(now).toLocaleString()}`,
      isActive: true,
      lastUsed: undefined,
      replacesKeyId: args.fromKeyId,
      graceUntil: now + graceMs,
    } as any);

    return { newKeyId, apiKey };
  },
});

export const toggle = mutation({
  args: {
    id: v.id("apiKeys"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const apiKey = await ctx.db.get(args.id);
    if (!apiKey || apiKey.userId !== userId) {
      throw new Error("API key not found or access denied");
    }

    await ctx.db.patch(args.id, {
      isActive: args.isActive,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("apiKeys") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const apiKey = await ctx.db.get(args.id);
    if (!apiKey || apiKey.userId !== userId) {
      throw new Error("API key not found or access denied");
    }

    await ctx.db.delete(args.id);
  },
});

// Internal: touch usage by API key and report if this was the first use
export const touchUsageByApiKey = internalMutation({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    const keyHash = await hashApiKey(args.apiKey);
    const record = await ctx.db
      .query("apiKeys")
      .withIndex("by_key_hash", (q) => q.eq("keyHash", keyHash))
      .first();

    if (!record || !record.isActive) {
      return null;
    }

    const now = Date.now();
    const isFirstUse = !record.lastUsed;

    await ctx.db.patch(record._id, {
      lastUsed: now,
    });

    let deactivatedOnGrace = false;

    // If this is an old key and a replacement exists whose grace has expired, deactivate this key now
    if (!record.replacesKeyId) {
      const replacement = await ctx.db
        .query("apiKeys")
        .withIndex("by_replaces", (q) => q.eq("replacesKeyId", record._id))
        .first();
      if (replacement && replacement.graceUntil && now > replacement.graceUntil && record.isActive) {
        await ctx.db.patch(record._id, { isActive: false });
        deactivatedOnGrace = true;
      }
    }

    return { 
      userId: record.userId, 
      isFirstUse,
      keyId: record._id,
      replacesKeyId: record.replacesKeyId,
      graceUntil: record.graceUntil,
      deactivatedOnGrace,
    };
  },
});

// Internal: deactivate a key by id
export const deactivate = internalMutation({
  args: { keyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    const rec = await ctx.db.get(args.keyId);
    if (rec && rec.isActive) {
      await ctx.db.patch(args.keyId, { isActive: false });
    }
  },
});

// Helper functions
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'sk_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
