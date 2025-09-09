import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const checkVerificationStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    return {
      isVerified: user?.isVerified || false,
      isAdmin: user?.isAdmin || false,
    };
  },
});

export const markUserAsVerified = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      isVerified: true,
    });
  },
});

export const resetUserVerification = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db.get(currentUserId);
    if (!currentUser?.isAdmin) {
      throw new Error("Only admins can reset user verification");
    }

    await ctx.db.patch(args.userId, {
      isVerified: false,
    });
  },
});
