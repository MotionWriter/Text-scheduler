import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const validateApiKey = internalQuery({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    // Hash the provided API key
    const keyHash = await hashApiKey(args.apiKey);
    
    // Find the API key in the database
    const apiKeyRecord = await ctx.db
      .query("apiKeys")
      .withIndex("by_key_hash", (q) => q.eq("keyHash", keyHash))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!apiKeyRecord) {
      return null;
    }

    return apiKeyRecord.userId;
  },
});

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
