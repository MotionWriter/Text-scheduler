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

    const groups = await ctx.db
      .query("groups")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get member count for each group
    const groupsWithCounts = await Promise.all(
      groups.map(async (group) => {
        const memberCount = await ctx.db
          .query("groupMemberships")
          .withIndex("by_group", (q) => q.eq("groupId", group._id))
          .collect();
        
        return {
          ...group,
          memberCount: memberCount.length,
        };
      })
    );

    return groupsWithCounts;
  },
});

export const getWithMembers = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group || group.userId !== userId) {
      throw new Error("Group not found or access denied");
    }

    const memberships = await ctx.db
      .query("groupMemberships")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (membership) => {
        const contact = await ctx.db.get(membership.contactId);
        return contact;
      })
    );

    return {
      ...group,
      members: members.filter(Boolean),
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.insert("groups", {
      userId,
      name: args.name,
      description: args.description,
      color: args.color,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("groups"),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const group = await ctx.db.get(args.id);
    if (!group || group.userId !== userId) {
      throw new Error("Group not found or access denied");
    }

    await ctx.db.patch(args.id, {
      name: args.name,
      description: args.description,
      color: args.color,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("groups") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const group = await ctx.db.get(args.id);
    if (!group || group.userId !== userId) {
      throw new Error("Group not found or access denied");
    }

    // Remove all memberships first
    const memberships = await ctx.db
      .query("groupMemberships")
      .withIndex("by_group", (q) => q.eq("groupId", args.id))
      .collect();

    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
    }

    // Then remove the group
    await ctx.db.delete(args.id);
  },
});

export const addMember = mutation({
  args: {
    groupId: v.id("groups"),
    contactId: v.id("contacts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify group belongs to user
    const group = await ctx.db.get(args.groupId);
    if (!group || group.userId !== userId) {
      throw new Error("Group not found or access denied");
    }

    // Verify contact belongs to user
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.userId !== userId) {
      throw new Error("Contact not found or access denied");
    }

    // Check if membership already exists
    const existingMembership = await ctx.db
      .query("groupMemberships")
      .withIndex("by_group_and_contact", (q) => 
        q.eq("groupId", args.groupId).eq("contactId", args.contactId)
      )
      .first();

    if (existingMembership) {
      throw new Error("Contact is already a member of this group");
    }

    return await ctx.db.insert("groupMemberships", {
      userId,
      groupId: args.groupId,
      contactId: args.contactId,
    });
  },
});

export const removeMember = mutation({
  args: {
    groupId: v.id("groups"),
    contactId: v.id("contacts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const membership = await ctx.db
      .query("groupMemberships")
      .withIndex("by_group_and_contact", (q) => 
        q.eq("groupId", args.groupId).eq("contactId", args.contactId)
      )
      .first();

    if (!membership || membership.userId !== userId) {
      throw new Error("Membership not found or access denied");
    }

    await ctx.db.delete(membership._id);
  },
});
