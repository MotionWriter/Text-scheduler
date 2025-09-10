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

export const listWithGroups = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get group memberships for each contact
    const contactsWithGroups = await Promise.all(
      contacts.map(async (contact) => {
        const memberships = await ctx.db
          .query("groupMemberships")
          .withIndex("by_contact", (q) => q.eq("contactId", contact._id))
          .collect();
        
        const groups = await Promise.all(
          memberships.map(async (membership) => {
            const group = await ctx.db.get(membership.groupId);
            return group;
          })
        );

        return {
          ...contact,
          groups: groups.filter(Boolean),
        };
      })
    );

    return contactsWithGroups;
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

    // Remove all group memberships first
    const memberships = await ctx.db
      .query("groupMemberships")
      .withIndex("by_contact", (q) => q.eq("contactId", args.id))
      .collect();

    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const createWithGroups = mutation({
  args: {
    name: v.string(),
    phoneNumber: v.string(),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    groupNames: v.optional(v.array(v.string())),
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

    // Create the contact first
    const contactId = await ctx.db.insert("contacts", {
      userId,
      name: args.name,
      phoneNumber: normalized,
      email: args.email,
      notes: args.notes,
    });

    // If group names provided, find or create groups and add memberships
    if (args.groupNames && args.groupNames.length > 0) {
      for (const groupName of args.groupNames) {
        if (!groupName.trim()) continue;
        
        // Find or create the group
        const existingGroup = await ctx.db
          .query("groups")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .filter((q) => q.eq(q.field("name"), groupName.trim()))
          .first();

        let groupId;
        if (existingGroup) {
          groupId = existingGroup._id;
        } else {
          // Assign a valid color from the allowed palette, preferring unused colors
          const existingGroups = await ctx.db
            .query("groups")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
          const existingColors = existingGroups.map(g => g.color);
          // Local import avoided inside handler; duplicate minimal chooser to prevent circular deps
          const GROUP_COLORS = [
            "#4F4F51", "#A1A094", "#A8B8C0", "#B9D2D2", "#D8C6B5", "#6B7280", "#7C8A55", "#8B4F4F", "#3B82F6"
          ];
          const used = new Set((existingColors.filter(Boolean) as string[]).map(c => c.toLowerCase()));
          const color = (GROUP_COLORS.find(c => !used.has(c.toLowerCase())) || GROUP_COLORS[0]);

          groupId = await ctx.db.insert("groups", {
            userId,
            name: groupName.trim(),
            color,
          });
        }

        // Create the membership
        await ctx.db.insert("groupMemberships", {
          userId,
          groupId,
          contactId,
        });
      }
    }

    return contactId;
  },
});
