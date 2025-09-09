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

    // Group by groupId + scheduledFor + message (only for rows with a groupId)
    type PendingRow = typeof messages[number];
    const grouped: Record<string, { rows: PendingRow[] }> = {};
    const singles: PendingRow[] = [];

    for (const m of messages) {
      if (m.groupId) {
        const key = `${m.groupId}|${m.scheduledFor}|${m.message}`;
        if (!grouped[key]) grouped[key] = { rows: [] };
        grouped[key].rows.push(m);
      } else {
        singles.push(m);
      }
    }

    // Build aggregated results
    const results: any[] = [];

    // Add aggregated group entries
    for (const key of Object.keys(grouped)) {
      const { rows } = grouped[key];
      const sample = rows[0];
      const group = await ctx.db.get(sample.groupId!);
      // Collect contact phone numbers and message IDs
      const phones: string[] = [];
      const messageIds: string[] = [];
      for (const row of rows) {
        const contact = await ctx.db.get(row.contactId);
        if (contact?.phoneNumber) phones.push(contact.phoneNumber);
        messageIds.push(row._id as unknown as string);
      }
      const phoneCsv = phones.join(",");
      const strHash = (s: string) => {
        let h = 0;
        for (let i = 0; i < s.length; i++) {
          h = (h << 5) - h + s.charCodeAt(i);
          h |= 0;
        }
        return Math.abs(h);
      };
      results.push({
        // Use a synthetic id for the aggregated entry for display purposes
        id: `agg:${String(sample.groupId)}:${sample.scheduledFor}:${strHash(sample.message)}`,
        message: sample.message,
        contact: {
          // Keep same location for phone number but merge as comma-separated string
          name: group?.name,
          phoneNumber: phoneCsv,
        },
        group: group ? { name: group.name, color: group.color } : null,
        scheduledFor: sample.scheduledFor,
        category: sample.category,
        // Include all underlying messageIds to allow marking sent/failed in bulk
        messageIds,
      });
    }

    // Add singles (no groupId)
    for (const m of singles) {
      const contact = await ctx.db.get(m.contactId);
      const group = m.groupId ? await ctx.db.get(m.groupId) : null;
      results.push({
        id: m._id,
        message: m.message,
        contact: {
          name: contact?.name,
          phoneNumber: contact?.phoneNumber,
        },
        group: group ? { name: group.name, color: group.color } : null,
        scheduledFor: m.scheduledFor,
        category: m.category,
        messageIds: [m._id as unknown as string],
      });
    }

    return results;
  },
});

// New: synchronize grouped messages with current group membership and return pending
export const getPendingMessagesCurrentGroup = internalMutation({
  args: { 
    userId: v.id("users"),
    category: v.optional(v.string()),
    startOfDay: v.optional(v.number()),
    endOfDay: v.optional(v.number()),
    groupOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Fetch all pending scheduled messages due now (and today if startOfDay provided)
    let query = ctx.db
      .query("scheduledMessages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "pending"),
          q.lte(q.field("scheduledFor"), now),
          args.startOfDay ? q.gte(q.field("scheduledFor"), args.startOfDay) : q.eq(1, 1),
          args.endOfDay ? q.lt(q.field("scheduledFor"), args.endOfDay) : q.eq(1, 1)
        )
      );
    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category));
    }
    const messages = await query.collect();

    type PendingRow = typeof messages[number];
    const grouped: Record<string, { rows: PendingRow[] }> = {};
    const singles: PendingRow[] = [];

    for (const m of messages) {
      if (m.groupId) {
        const key = `${m.groupId}|${m.scheduledFor}|${m.message}`;
        if (!grouped[key]) grouped[key] = { rows: [] };
        grouped[key].rows.push(m);
      } else {
        singles.push(m);
      }
    }

    // For each grouped set, backfill missing members and cancel removed members
    for (const key of Object.keys(grouped)) {
      const { rows } = grouped[key];
      const sample = rows[0];
      const groupId = sample.groupId!;

      // Current membership
      const memberships = await ctx.db
        .query("groupMemberships")
        .withIndex("by_group", (q) => q.eq("groupId", groupId))
        .collect();
      const currentContactIds = new Set(memberships.map(m => m.contactId));

      const rowContactIds = new Set(rows.map(r => r.contactId));

      // Insert missing members
      for (const membership of memberships) {
        if (!rowContactIds.has(membership.contactId)) {
          await ctx.db.insert("scheduledMessages", {
            userId: sample.userId,
            contactId: membership.contactId,
            groupId: groupId,
            templateId: sample.templateId,
            message: sample.message,
            scheduledFor: sample.scheduledFor,
            status: "pending",
            notes: sample.notes,
            category: sample.category,
          });
        }
      }

      // Mark rows for contacts no longer in group as failed with note (legacy table doesn't support 'cancelled')
      for (const row of rows) {
        if (!currentContactIds.has(row.contactId)) {
          await ctx.db.patch(row._id, { status: "failed", notes: "Removed from group membership" });
        }
      }
    }

    // Re-query pending after sync
    let refreshed = ctx.db
      .query("scheduledMessages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "pending"),
          q.lte(q.field("scheduledFor"), now),
          args.startOfDay ? q.gte(q.field("scheduledFor"), args.startOfDay) : q.eq(1, 1),
          args.endOfDay ? q.lt(q.field("scheduledFor"), args.endOfDay) : q.eq(1, 1)
        )
      );
    if (args.category) {
      refreshed = refreshed.filter((q) => q.eq(q.field("category"), args.category));
    }
    const refreshedMessages = await refreshed.collect();

    // Regroup and build results using up-to-date membership
    const regrouped: Record<string, { rows: PendingRow[] }> = {};
    const singles2: PendingRow[] = [];
    for (const m of refreshedMessages) {
      if (m.groupId) {
        const key2 = `${m.groupId}|${m.scheduledFor}|${m.message}`;
        if (!regrouped[key2]) regrouped[key2] = { rows: [] };
        regrouped[key2].rows.push(m);
      } else {
        singles2.push(m);
      }
    }

    const results: any[] = [];

    // Build group entries using current group membership phone list
    for (const key2 of Object.keys(regrouped)) {
      const { rows } = regrouped[key2];
      const sample = rows[0];
      const group = await ctx.db.get(sample.groupId!);

      // Derive phone list from CURRENT group membership
      const memberships = await ctx.db
        .query("groupMemberships")
        .withIndex("by_group", (q) => q.eq("groupId", sample.groupId!))
        .collect();
      const currentContactIds = memberships.map(m => m.contactId);

      const phones: string[] = [];
      const messageIds: string[] = [];

      // Build phone list from CURRENT group membership to ensure late-added members are included
      for (const mem of memberships) {
        const contact = await ctx.db.get(mem.contactId);
        if (contact?.phoneNumber) phones.push(contact.phoneNumber);
      }
      // Include IDs for pending rows that correspond to current members
      for (const row of rows) {
        if (currentContactIds.some(id => id === row.contactId)) {
          messageIds.push(row._id as unknown as string);
        }
      }
      const phoneCsv = Array.from(new Set(phones)).join(",");
      const strHash = (s: string) => {
        let h = 0;
        for (let i = 0; i < s.length; i++) {
          h = (h << 5) - h + s.charCodeAt(i);
          h |= 0;
        }
        return Math.abs(h);
      };

      results.push({
        id: `agg:${String(sample.groupId)}:${sample.scheduledFor}:${strHash(sample.message)}`,
        message: sample.message,
        contact: {
          name: group?.name,
          phoneNumber: phoneCsv,
        },
        group: group ? { name: group.name, color: group.color } : null,
        scheduledFor: sample.scheduledFor,
        category: sample.category,
        messageIds,
      });
    }

    // Add singles unchanged
    for (const m of singles2) {
      const contact = await ctx.db.get(m.contactId);
      const group = m.groupId ? await ctx.db.get(m.groupId) : null;
      results.push({
        id: m._id,
        message: m.message,
        contact: {
          name: contact?.name,
          phoneNumber: contact?.phoneNumber,
        },
        group: group ? { name: group.name, color: group.color } : null,
        scheduledFor: m.scheduledFor,
        category: m.category,
        messageIds: [m._id as unknown as string],
      });
    }

    // If groupOnly is requested, filter out non-group entries
    if (args.groupOnly) {
      return results.filter((r: any) => r.group && r.group.name);
    }

    return results;
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

export const markMessagesAsSent = internalMutation({
  args: {
    userId: v.id("users"),
    messageIds: v.array(v.string()),
    sentAt: v.number(),
  },
  handler: async (ctx, args) => {
    for (const id of args.messageIds) {
      const messageId = id as Id<"scheduledMessages">;
      const message = await ctx.db.get(messageId);
      if (!message || message.userId !== args.userId) {
        throw new Error("Message not found or access denied");
      }
      await ctx.db.patch(messageId, { status: "sent", sentAt: args.sentAt });
    }
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

export const markMessagesAsFailed = internalMutation({
  args: {
    userId: v.id("users"),
    messageIds: v.array(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    for (const id of args.messageIds) {
      const messageId = id as Id<"scheduledMessages">;
      const message = await ctx.db.get(messageId);
      if (!message || message.userId !== args.userId) {
        throw new Error("Message not found or access denied");
      }
      await ctx.db.patch(messageId, { status: "failed", notes: args.notes });
    }
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
