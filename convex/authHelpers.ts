import { query } from "./_generated/server";
import { v } from "convex/values";

export const checkAuthProvidersForEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalized = email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", normalized))
      .unique();
    if (!user) return { exists: false, hasGoogle: false, hasPassword: false };

    // Query accounts for this user
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id))
      .collect();

    const hasGoogle = accounts.some((a: any) => a.provider === "google");
    const hasPassword = accounts.some((a: any) => a.provider === "password");
    return { exists: true, hasGoogle, hasPassword };
  },
});
