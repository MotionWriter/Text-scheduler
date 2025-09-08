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
    if (!userId) {
      throw new Error("Not authenticated");
    }

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

export const toggle = mutation({
  args: {
    id: v.id("apiKeys"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

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
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const apiKey = await ctx.db.get(args.id);
    if (!apiKey || apiKey.userId !== userId) {
      throw new Error("API key not found or access denied");
    }

    await ctx.db.delete(args.id);
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
