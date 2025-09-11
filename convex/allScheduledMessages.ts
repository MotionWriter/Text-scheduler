import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get manual scheduled messages
    const manualMessages = await ctx.db
      .query("scheduledMessages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get study book scheduled messages (userSelectedMessages that are scheduled)
    const studyMessages = await ctx.db
      .query("userSelectedMessages")
      .withIndex("by_user_scheduled", (q) => q.eq("userId", userId).eq("isScheduled", true))
      .collect();

  // Separate group and single-recipient manual messages
  const manualGroupRows = manualMessages.filter((m) => !!m.groupId);
  const manualSingles = manualMessages.filter((m) => !m.groupId);

  // Aggregate group manual messages by groupId + scheduledFor + message
  const manualAggregatedMap = new Map<string, any[]>();
  for (const m of manualGroupRows) {
    const key = `${String(m.groupId)}|${m.scheduledFor}|${m.message}`;
    if (!manualAggregatedMap.has(key)) manualAggregatedMap.set(key, []);
    manualAggregatedMap.get(key)!.push(m);
  }

  const aggregatedManualGroups = await Promise.all(
    Array.from(manualAggregatedMap.entries()).map(async ([key, rows]) => {
      const sample = rows[0];
      const group = await ctx.db.get(sample.groupId!);
      const template = sample.templateId ? await ctx.db.get(sample.templateId) : null;
      const contacts = await Promise.all(rows.map((r) => ctx.db.get(r.contactId)));
      const phoneCsv = contacts
        .map((c) => (c as any)?.phoneNumber)
        .filter((p): p is string => typeof p === 'string' && p.length > 0)
        .join(',');

      // Derive a single aggregated status for the group
      // Priority: any failed -> failed; else if all sent -> sent; else pending
      let aggregatedStatus: "pending" | "sent" | "failed" = "pending";
      const anyFailed = rows.some(r => r.status === "failed");
      const allSent = rows.every(r => r.status === "sent");
      if (anyFailed) aggregatedStatus = "failed";
      else if (allSent) aggregatedStatus = "sent";

      return {
        _id: rows[0]._id, // representative id for UI row (non-editable)
        _creationTime: rows[0]._creationTime,
        userId: rows[0].userId,
        contactId: null,
        groupId: sample.groupId,
        templateId: sample.templateId,
        message: sample.message,
        scheduledFor: sample.scheduledFor,
        status: aggregatedStatus,
        sentAt: undefined,
        notes: undefined,
        category: sample.category,
        contact: { name: (group as any)?.name || "", phoneNumber: phoneCsv },
        group: group,
        template,
        source: "manual" as const,
        aggregated: true as const,
        messageIds: rows.map((r) => r._id),
      };
    })
  );

  // Enrich single-recipient manual messages as before
  const enrichedManualSingles = await Promise.all(
    manualSingles.map(async (message) => {
      const contact = await ctx.db.get(message.contactId);
      const group = message.groupId ? await ctx.db.get(message.groupId) : null;
      const template = message.templateId ? await ctx.db.get(message.templateId) : null;
      
      return {
        ...message,
        contact,
        group,
        template,
        source: "manual" as const,
        scheduledFor: message.scheduledFor,
      };
    })
  );

  // Enrich study messages with lesson and message content data
  const enrichedStudyMessages = await Promise.all(
    studyMessages.map(async (selection) => {
      const lesson = await ctx.db.get(selection.lessonId);
      const studyBook = lesson ? await ctx.db.get(lesson.studyBookId) : null;
      
      // Get the group preference for this study book, with lesson-level fallback
      let group = null;
      let groupId = null;
      if (studyBook) {
        const groupPref = await ctx.db
          .query("studyGroupPreferences")
          .withIndex("by_user_study", (q) => q.eq("userId", userId).eq("studyBookId", studyBook._id))
          .first();
        if (groupPref) {
          groupId = groupPref.groupId;
          group = await ctx.db.get(groupPref.groupId);
        } else if (lesson) {
          // Fallback to a per-lesson override if present
          const lessonPref = await ctx.db
            .query("lessonGroupPreferences")
            .withIndex("by_user_lesson", (q) => q.eq("userId", userId).eq("lessonId", lesson._id))
            .first();
          if (lessonPref) {
            groupId = lessonPref.groupId;
            group = await ctx.db.get(lessonPref.groupId);
          }
        }
      }
      
      let messageContent = "";
      let messageSource = "unknown";
      
      if (selection.predefinedMessageId) {
        const predefinedMessage = await ctx.db.get(selection.predefinedMessageId);
        if (predefinedMessage) {
          messageContent = predefinedMessage.content;
          messageSource = "predefined";
        }
      } else if (selection.customMessageId) {
        const customMessage = await ctx.db.get(selection.customMessageId);
        if (customMessage) {
          messageContent = customMessage.content;
          messageSource = "custom";
        }
      }
      
      return {
        _id: selection._id,
        _creationTime: selection._creationTime,
        userId: selection.userId,
        contactId: null, // Study messages don't have specific contacts yet
        groupId,
        templateId: null,
        message: messageContent,
        scheduledFor: selection.scheduledAt || 0,
        status: selection.deliveryStatus || "pending" as const,
        sentAt: selection.actualDeliveryTime,
        notes: selection.deliveryError,
        category: `${studyBook?.title} - Lesson ${lesson?.lessonNumber}`,
        contact: null,
        group,
        template: null,
        source: "study" as const,
        messageSource,
        lesson,
        studyBook,
        customMessageId: selection.customMessageId, // Include for editing custom messages
      };
    })
  );

  // Combine and sort by scheduled time (newest first)
  const allMessages = [
    ...aggregatedManualGroups,
    ...enrichedManualSingles,
    ...enrichedStudyMessages,
  ].sort((a, b) => b.scheduledFor - a.scheduledFor);

  return allMessages;
  },
});