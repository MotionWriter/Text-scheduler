import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const getPendingMessages = internalQuery({
  args: { 
    userId: v.id("users"),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    let query = ctx.db
      .query("scheduledMessages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "pending"),
          q.lte(q.field("scheduledFor"), now)
        )
      );

    // Filter by category if provided
    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category));
    }

    const messages = await query.collect();

    // Enrich with contact and group data
    const enrichedMessages = await Promise.all(
      messages.map(async (message) => {
        const contact = await ctx.db.get(message.contactId);
        const group = message.groupId ? await ctx.db.get(message.groupId) : null;
        
        return {
          id: message._id,
          message: message.message,
          contact: {
            name: contact?.name,
            phoneNumber: contact?.phoneNumber,
          },
          group: group ? {
            name: group.name,
            color: group.color,
          } : null,
          scheduledFor: message.scheduledFor,
          category: message.category,
        };
      })
    );

    return enrichedMessages;
  },
});

export const markMessageAsSent = internalMutation({
  args: {
    userId: v.id("users"),
    messageId: v.string(),
    sentAt: v.number(),
  },
  handler: async (ctx, args) => {
    const messageId = args.messageId as Id<"scheduledMessages">;
    const message = await ctx.db.get(messageId);
    
    if (!message || message.userId !== args.userId) {
      throw new Error("Message not found or access denied");
    }

    await ctx.db.patch(messageId, {
      status: "sent",
      sentAt: args.sentAt,
    });

    // Update API key last used timestamp
    await updateApiKeyLastUsed(ctx, args.userId);
  },
});

export const markMessageAsFailed = internalMutation({
  args: {
    userId: v.id("users"),
    messageId: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const messageId = args.messageId as Id<"scheduledMessages">;
    const message = await ctx.db.get(messageId);
    
    if (!message || message.userId !== args.userId) {
      throw new Error("Message not found or access denied");
    }

    await ctx.db.patch(messageId, {
      status: "failed",
      notes: args.notes,
    });

    // Update API key last used timestamp
    await updateApiKeyLastUsed(ctx, args.userId);
  },
});

async function updateApiKeyLastUsed(ctx: any, userId: Id<"users">) {
  const apiKeys = await ctx.db
    .query("apiKeys")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .filter((q: any) => q.eq(q.field("isActive"), true))
    .collect();

  if (apiKeys.length > 0) {
    await ctx.db.patch(apiKeys[0]._id, {
      lastUsed: Date.now(),
    });
  }
}
