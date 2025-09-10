import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { GROUP_COLORS, chooseGroupColor } from "./utils/groupColors";

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

    // Validate color if provided, otherwise auto-select from available colors
    let color = args.color;
    if (color && !GROUP_COLORS.includes(color)) {
      throw new Error(`Invalid color. Must be one of: ${GROUP_COLORS.join(", ")}`);
    }
    
    if (!color) {
      // Get existing colors to avoid duplicates
      const existingGroups = await ctx.db
        .query("groups")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      const existingColors = existingGroups.map(g => g.color);
      color = chooseGroupColor(existingColors);
    }

    return await ctx.db.insert("groups", {
      userId,
      name: args.name,
      description: args.description,
      color,
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

    let color = args.color;
    if (color && !GROUP_COLORS.includes(color)) {
      throw new Error(`Invalid color. Must be one of: ${GROUP_COLORS.join(", ")}`);
    }

    await ctx.db.patch(args.id, {
      name: args.name,
      description: args.description,
      color,
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

// Set a contact to exactly one group by clearing existing memberships for that contact
export const setContactToSingleGroup = mutation({
  args: {
    contactId: v.id("contacts"),
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify contact belongs to user
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.userId !== userId) throw new Error("Contact not found or access denied");

    // Verify group belongs to user
    const group = await ctx.db.get(args.groupId);
    if (!group || group.userId !== userId) throw new Error("Group not found or access denied");

    // Remove all memberships for this contact
    const existing = await ctx.db
      .query("groupMemberships")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .collect();

    for (const m of existing) {
      if (m.userId === userId) {
        await ctx.db.delete(m._id);
      }
    }

    // Add membership to selected group
    await ctx.db.insert("groupMemberships", {
      userId,
      groupId: args.groupId,
      contactId: args.contactId,
    });
  },
});

// Clear all group memberships for a contact (i.e., set to "No Group")
export const clearContactGroups = mutation({
  args: {
    contactId: v.id("contacts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.userId !== userId) throw new Error("Contact not found or access denied");

    const existing = await ctx.db
      .query("groupMemberships")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .collect();

    for (const m of existing) {
      if (m.userId === userId) {
        await ctx.db.delete(m._id);
      }
    }
  },
});

export const findOrCreate = mutation({
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

    // Try to find existing group with same name
    const existingGroup = await ctx.db
      .query("groups")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    if (existingGroup) {
      return existingGroup._id;
    }

    // Validate color if provided, otherwise auto-select from available colors
    let color = args.color;
    if (color && !GROUP_COLORS.includes(color)) {
      throw new Error(`Invalid color. Must be one of: ${GROUP_COLORS.join(", ")}`);
    }
    
    if (!color) {
      // Get existing colors to avoid duplicates
      const existingGroups = await ctx.db
        .query("groups")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      const existingColors = existingGroups.map(g => g.color);
      color = chooseGroupColor(existingColors);
    }

    // Create new group if none found
    return await ctx.db.insert("groups", {
      userId,
      name: args.name,
      description: args.description,
      color,
    });
  },
});

// Migration function to fix groups with invalid or missing colors
export const fixGroupColors = mutation({
  args: {},
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const allGroups = await ctx.db
      .query("groups")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let fixedCount = 0;
    const validColors = new Set(allGroups.map(g => g.color).filter(c => c && GROUP_COLORS.includes(c)));

    for (const group of allGroups) {
      const needsFixing = !group.color || !GROUP_COLORS.includes(group.color);
      if (needsFixing) {
        const newColor = chooseGroupColor(Array.from(validColors));
        await ctx.db.patch(group._id, { color: newColor });
        validColors.add(newColor);
        fixedCount++;
      }
    }

    return { fixedCount, totalGroups: allGroups.length };
  },
});
