import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./_lib/userAuth";

// Get user's selected messages for a lesson
export const getForLesson = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    const selections = await ctx.db
      .query("userSelectedMessages")
      .withIndex("by_user_lesson", q => q.eq("userId", user._id).eq("lessonId", args.lessonId))
      .collect();
    
    // Enhance with actual message content
    const enhancedSelections = await Promise.all(
      selections.map(async (selection) => {
        let messageContent = null;
        let messageType = "custom";
        
        if (selection.predefinedMessageId) {
          const predefinedMessage = await ctx.db.get(selection.predefinedMessageId);
          if (predefinedMessage) {
            messageContent = predefinedMessage.content;
            messageType = "predefined";
          }
        } else if (selection.customMessageId) {
          const customMessage = await ctx.db.get(selection.customMessageId);
          if (customMessage) {
            messageContent = customMessage.content;
            messageType = "custom";
          }
        }
        
        return {
          ...selection,
          messageContent,
          messageType,
        };
      })
    );
    
    return enhancedSelections;
  },
});

// Get all scheduled messages for user
export const getScheduled = query({
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    
    return await ctx.db
      .query("userSelectedMessages")
      .withIndex("by_user_scheduled", q => q.eq("userId", user._id).eq("isScheduled", true))
      .collect();
  },
});

// Get user's selected messages across all lessons in a study book
export const getForStudyBook = query({
  args: { studyBookId: v.id("studyBooks") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Get lesson ids for this study book
    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_study_book", q => q.eq("studyBookId", args.studyBookId))
      .collect();
    const lessonIds = new Set(lessons.map(l => l._id));

    // Get user's selections for the lessons in this study book
    const results: any[] = []
    for (const lesson of lessons) {
      const sel = await ctx.db
        .query("userSelectedMessages")
        .withIndex("by_lesson", q => q.eq("lessonId", lesson._id))
        .collect()
      for (const s of sel) {
        if (s.userId === user._id) {
          results.push({ ...s, lesson })
        }
      }
    }

    // Enrich with message content for display
    const enriched = await Promise.all(results.map(async (s) => {
      let messageContent: string | null = null
      if (s.predefinedMessageId) {
        const pm = await ctx.db.get(s.predefinedMessageId)
        if (pm) messageContent = (pm as any).content
      } else if (s.customMessageId) {
        const cm = await ctx.db.get(s.customMessageId)
        if (cm) messageContent = (cm as any).content
      }
      return { ...s, messageContent }
    }))

    return enriched;
  },
});

// Select a predefined message
export const selectPredefined = mutation({
  args: {
    predefinedMessageId: v.id("predefinedMessages"),
    scheduledAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    // Verify predefined message exists
    const predefinedMessage = await ctx.db.get(args.predefinedMessageId);
    if (!predefinedMessage) {
      throw new Error("Predefined message not found");
    }
    
    // Check if user already selected this message
    const existingSelection = await ctx.db
      .query("userSelectedMessages")
      .filter(q => 
        q.and(
          q.eq(q.field("userId"), user._id),
          q.eq(q.field("predefinedMessageId"), args.predefinedMessageId)
        )
      )
      .first();
    
    if (existingSelection) {
      throw new Error("You have already selected this predefined message");
    }
    
    return await ctx.db.insert("userSelectedMessages", {
      userId: user._id,
      predefinedMessageId: args.predefinedMessageId,
      customMessageId: undefined,
      lessonId: predefinedMessage.lessonId,
      scheduledAt: args.scheduledAt,
      isScheduled: !!args.scheduledAt,
      createdAt: Date.now(),
    });
  },
});

// Select a custom message
export const selectCustom = mutation({
  args: {
    customMessageId: v.id("userCustomMessages"),
    scheduledAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    // Verify custom message exists and belongs to user
    const customMessage = await ctx.db.get(args.customMessageId);
    if (!customMessage || customMessage.userId !== user._id) {
      throw new Error("Custom message not found or access denied");
    }
    
    // Check if user already selected this message
    const existingSelection = await ctx.db
      .query("userSelectedMessages")
      .filter(q => 
        q.and(
          q.eq(q.field("userId"), user._id),
          q.eq(q.field("customMessageId"), args.customMessageId)
        )
      )
      .first();
    
    if (existingSelection) {
      throw new Error("You have already selected this custom message");
    }
    
    return await ctx.db.insert("userSelectedMessages", {
      userId: user._id,
      predefinedMessageId: undefined,
      customMessageId: args.customMessageId,
      lessonId: customMessage.lessonId,
      scheduledAt: args.scheduledAt,
      isScheduled: !!args.scheduledAt,
      createdAt: Date.now(),
    });
  },
});

// Update selection scheduling
export const updateScheduling = mutation({
  args: {
    id: v.id("userSelectedMessages"),
    scheduledAt: v.optional(v.number()),
    isScheduled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    // Verify ownership
    const selection = await ctx.db.get(args.id);
    if (!selection || selection.userId !== user._id) {
      throw new Error("Selection not found or access denied");
    }

    // Update schedule on the selection
    await ctx.db.patch(args.id, {
      scheduledAt: args.scheduledAt,
      isScheduled: args.isScheduled,
      // Reset delivery state when rescheduling
      deliveryStatus: undefined,
      deliveryAttempts: 0,
      lastDeliveryAttempt: undefined,
      deliveryError: undefined,
    });

    // If scheduling is set and a lesson->group mapping exists, fan out to group members
    if (args.isScheduled && args.scheduledAt) {
      const pref = await ctx.db
        .query("lessonGroupPreferences")
        .withIndex("by_user_lesson", q => q.eq("userId", user._id).eq("lessonId", selection.lessonId))
        .first();

      if (pref) {
        // Determine message content
        let content = "";
        if (selection.predefinedMessageId) {
          const pm = await ctx.db.get(selection.predefinedMessageId);
          content = (pm as any)?.content || "";
        } else if (selection.customMessageId) {
          const cm = await ctx.db.get(selection.customMessageId);
          content = (cm as any)?.content || "";
        }

        // Get group members
        const memberships = await ctx.db
          .query("groupMemberships")
          .withIndex("by_group", q => q.eq("groupId", pref.groupId))
          .collect();

        for (const m of memberships) {
          await ctx.db.insert("scheduledMessages", {
            userId: user._id,
            contactId: m.contactId,
            groupId: pref.groupId,
            templateId: undefined,
            message: content,
            scheduledFor: args.scheduledAt,
            status: "pending",
            notes: undefined,
            category: "study",
          });
        }

        // Prevent duplicate send via userSelectedMessages cron path
        await ctx.db.patch(args.id, {
          deliveryStatus: "cancelled",
          deliveryError: undefined,
        });
      }
    }
  },
});
