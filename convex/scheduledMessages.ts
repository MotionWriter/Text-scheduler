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

    const messages = await ctx.db
      .query("scheduledMessages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Enrich with contact, group, and template data
    const enrichedMessages = await Promise.all(
      messages.map(async (message) => {
        const contact = await ctx.db.get(message.contactId);
        const group = message.groupId ? await ctx.db.get(message.groupId) : null;
        const template = message.templateId ? await ctx.db.get(message.templateId) : null;
        
        return {
          ...message,
          contact,
          group,
          template,
        };
      })
    );

    return enrichedMessages;
  },
});

export const create = mutation({
  args: {
    contactId: v.id("contacts"),
    groupId: v.optional(v.id("groups")),
    templateId: v.optional(v.id("messageTemplates")),
    message: v.string(),
    scheduledFor: v.number(),
    notes: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify contact belongs to user
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.userId !== userId) {
      throw new Error("Contact not found or access denied");
    }

    // Verify group belongs to user (if provided)
    if (args.groupId) {
      const group = await ctx.db.get(args.groupId);
      if (!group || group.userId !== userId) {
        throw new Error("Group not found or access denied");
      }
    }

    // Verify template belongs to user (if provided)
    if (args.templateId) {
      const template = await ctx.db.get(args.templateId);
      if (!template || template.userId !== userId) {
        throw new Error("Template not found or access denied");
      }
    }

    return await ctx.db.insert("scheduledMessages", {
      userId,
      contactId: args.contactId,
      groupId: args.groupId,
      templateId: args.templateId,
      message: args.message,
      scheduledFor: args.scheduledFor,
      status: "pending",
      notes: args.notes,
      category: args.category,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("scheduledMessages"),
    message: v.string(),
    scheduledFor: v.number(),
    notes: v.optional(v.string()),
    category: v.optional(v.string()),
    templateId: v.optional(v.id("messageTemplates")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.id);
    if (!message || message.userId !== userId) {
      throw new Error("Message not found or access denied");
    }

    // Only allow editing pending messages
    if (message.status !== "pending") {
      throw new Error("Can only edit pending messages");
    }

    await ctx.db.patch(args.id, {
      message: args.message,
      scheduledFor: args.scheduledFor,
      notes: args.notes,
      category: args.category,
      templateId: args.templateId,
    });
  },
});

export const createForGroup = mutation({
  args: {
    groupId: v.id("groups"),
    templateId: v.optional(v.id("messageTemplates")),
    message: v.string(),
    scheduledFor: v.number(),
    notes: v.optional(v.string()),
    category: v.optional(v.string()),
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

    // Verify template belongs to user (if provided)
    if (args.templateId) {
      const template = await ctx.db.get(args.templateId);
      if (!template || template.userId !== userId) {
        throw new Error("Template not found or access denied");
      }
    }

    // Get all group members
    const memberships = await ctx.db
      .query("groupMemberships")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    // Create a scheduled message for each group member
    const messageIds = [];
    for (const membership of memberships) {
      const messageId = await ctx.db.insert("scheduledMessages", {
        userId,
        contactId: membership.contactId,
        groupId: args.groupId,
        templateId: args.templateId,
        message: args.message,
        scheduledFor: args.scheduledFor,
        status: "pending",
        notes: args.notes,
        category: args.category,
      });
      messageIds.push(messageId);
    }

    return messageIds;
  },
});

export const markAsSent = mutation({
  args: {
    id: v.id("scheduledMessages"),
    sentAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.id);
    if (!message || message.userId !== userId) {
      throw new Error("Message not found or access denied");
    }

    await ctx.db.patch(args.id, {
      status: "sent",
      sentAt: args.sentAt,
    });
  },
});

export const markAsFailed = mutation({
  args: {
    id: v.id("scheduledMessages"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.id);
    if (!message || message.userId !== userId) {
      throw new Error("Message not found or access denied");
    }

    await ctx.db.patch(args.id, {
      status: "failed",
      notes: args.notes,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("scheduledMessages") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.id);
    if (!message || message.userId !== userId) {
      throw new Error("Message not found or access denied");
    }

    await ctx.db.delete(args.id);
  },
});
