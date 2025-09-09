import { mutation } from "./_generated/server";
import { v } from "convex/values";

// This is a one-time setup function to create an admin user
// Run this manually in the Convex dashboard or via npx convex run
export const makeUserAdmin = mutation({
  args: { 
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.userEmail))
      .first();
    
    if (!user) {
      throw new Error(`User with email ${args.userEmail} not found`);
    }

    // Make them admin and verified
    await ctx.db.patch(user._id, {
      isAdmin: true,
      isVerified: true, // Admins bypass verification requirement
    });

    return `User ${args.userEmail} is now an admin and verified`;
  },
});

export const createTestUsers = mutation({
  args: {},
  handler: async (ctx) => {
    // This would normally be handled by the auth system
    // but for testing, we can create some sample scenarios
    console.log("Test users should be created through the normal signup flow");
    return "Use the signup flow to create test users";
  },
});
