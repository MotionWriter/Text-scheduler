import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUser } from "./_lib/userAuth";

// Get user's progress through lessons
export const getLessonProgress = query({
  args: { studyBookId: v.optional(v.id("studyBooks")) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    // Get lessons for study book (or all lessons if no study book specified)
    const lessons = args.studyBookId 
      ? await ctx.db
          .query("lessons")
          .withIndex("by_study_book_number", q => q.eq("studyBookId", args.studyBookId!))
          .collect()
      : await ctx.db.query("lessons").collect();
    
    const progress = await Promise.all(
      lessons.map(async (lesson) => {
        // Count custom messages for this lesson
        const customMessages = await ctx.db
          .query("userCustomMessages")
          .withIndex("by_user_lesson", q => q.eq("userId", user._id).eq("lessonId", lesson._id))
          .collect();
        
        // Count selected messages for this lesson
        const selectedMessages = await ctx.db
          .query("userSelectedMessages")
          .withIndex("by_user_lesson", q => q.eq("userId", user._id).eq("lessonId", lesson._id))
          .collect();
        
        return {
          lesson,
          customMessagesCount: customMessages.length,
          customMessagesRemaining: Math.max(0, 2 - customMessages.length),
          selectedMessagesCount: selectedMessages.length,
          hasActivity: customMessages.length > 0 || selectedMessages.length > 0,
        };
      })
    );
    
    return progress.sort((a, b) => a.lesson.lessonNumber - b.lesson.lessonNumber);
  },
});

// Get user's recent activity
export const getRecentActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const limit = args.limit || 10;
    
    // Get recent custom messages
    const recentCustomMessages = await ctx.db
      .query("userCustomMessages")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .order("desc")
      .take(limit);
    
    // Get recent message selections
    const recentSelections = await ctx.db
      .query("userSelectedMessages")
      .filter(q => q.eq(q.field("userId"), user._id))
      .order("desc")
      .take(limit);
    
    return {
      recentCustomMessages,
      recentSelections,
    };
  },
});