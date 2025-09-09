import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./_lib/userAuth";

export const listByStudyBook = query({
  args: { studyBookId: v.id("studyBooks") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Get all lessons for this study book
    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_study_book", q => q.eq("studyBookId", args.studyBookId))
      .collect();

    // Get all predefined messages for these lessons
    const allPredefinedMessages = [];
    for (const lesson of lessons) {
      const predefinedMessages = await ctx.db
        .query("predefinedMessages")
        .withIndex("by_lesson", q => q.eq("lessonId", lesson._id))
        .filter(q => q.eq(q.field("isActive"), true))
        .order("asc")
        .collect();

      for (const message of predefinedMessages) {
        allPredefinedMessages.push({
          ...message,
          lesson,
          source: "predefined" as const
        });
      }
    }

    // Get all custom messages for these lessons (belonging to the current user)
    const allCustomMessages = [];
    for (const lesson of lessons) {
      const customMessages = await ctx.db
        .query("userCustomMessages")
        .withIndex("by_user_lesson", q => q.eq("userId", user._id).eq("lessonId", lesson._id))
        .collect();

      for (const message of customMessages) {
        allCustomMessages.push({
          _id: message._id,
          _creationTime: message._creationTime,
          lessonId: message.lessonId,
          content: message.content,
          messageType: "custom",
          displayOrder: 999, // Put custom messages after predefined ones
          createdBy: message.userId,
          createdAt: message.createdAt,
          isActive: true,
          lesson,
          source: "custom" as const
        });
      }
    }

    // Combine and sort by lesson number, then by display order
    const allMessages = [...allPredefinedMessages, ...allCustomMessages];
    allMessages.sort((a, b) => {
      if (a.lesson.lessonNumber !== b.lesson.lessonNumber) {
        return a.lesson.lessonNumber - b.lesson.lessonNumber;
      }
      return a.displayOrder - b.displayOrder;
    });

    return allMessages;
  },
});