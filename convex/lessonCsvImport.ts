import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./_lib/adminAuth";

export const importLessonContent = mutation({
  args: {
    studyBookId: v.id("studyBooks"),
    rows: v.array(v.object({
      lessonNumber: v.number(),
      lessonTitle: v.optional(v.string()),
      lessonDescription: v.optional(v.string()),
      messageType: v.string(),
      content: v.string(),
      displayOrder: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    // Dev-only bypass: allow import without admin if env is set (ownDev only)
    const bypass = process.env.ALLOW_DEV_IMPORT_BYPASS === "true";

    let createdByUserId: any = null;
    if (!bypass) {
      const admin = await requireAdmin(ctx);
      createdByUserId = admin._id;
    } else {
      // Try to find any admin user to attribute createdBy
      const adminUser = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("isAdmin"), true))
        .first();
      if (adminUser) {
        createdByUserId = adminUser._id;
      } else {
        // Fallback: any user in the system
        const anyUser = await ctx.db.query("users").first();
        if (!anyUser) {
          throw new Error("Dev import bypass enabled but no users found to attribute createdBy. Create a user first.");
        }
        createdByUserId = anyUser._id;
      }
    }

    // Fetch existing lessons for study book
    const existingLessons = await ctx.db
      .query("lessons")
      .withIndex("by_study_book_number", q => q.eq("studyBookId", args.studyBookId))
      .collect();

    const lessonByNumber = new Map<number, any>();
    for (const l of existingLessons) lessonByNumber.set(l.lessonNumber, l);

    let createdLessons = 0;
    let createdMessages = 0;

    // Ensure lessons exist and optionally update title/description
    for (const row of args.rows) {
      if (!lessonByNumber.has(row.lessonNumber)) {
        const id = await ctx.db.insert("lessons", {
          studyBookId: args.studyBookId,
          lessonNumber: row.lessonNumber,
          title: row.lessonTitle || `Lesson ${row.lessonNumber}`,
          description: row.lessonDescription,
          createdAt: Date.now(),
          isActive: true,
        });
        const l = await ctx.db.get(id);
        if (l) lessonByNumber.set(row.lessonNumber, l);
        createdLessons++;
      } else {
        const l = lessonByNumber.get(row.lessonNumber);
        const patch: any = {};
        if (row.lessonTitle && row.lessonTitle !== l.title) patch.title = row.lessonTitle;
        if (row.lessonDescription && row.lessonDescription !== l.description) patch.description = row.lessonDescription;
        if (Object.keys(patch).length > 0) {
          await ctx.db.patch(l._id, patch);
          const updated = await ctx.db.get(l._id);
          if (updated) lessonByNumber.set(row.lessonNumber, updated);
        }
      }
    }

    // Precompute next displayOrder per lesson
    const nextOrderByLesson: Record<string, number> = {};
    for (const [num, lesson] of lessonByNumber) {
      const msgs = await ctx.db
        .query("predefinedMessages")
        .withIndex("by_lesson", q => q.eq("lessonId", lesson._id))
        .collect();
      nextOrderByLesson[String(lesson._id)] = (msgs.reduce((max, m) => Math.max(max, m.displayOrder || 0), 0) || 0) + 1;
    }

    // Insert messages
    for (const row of args.rows) {
      const lesson = lessonByNumber.get(row.lessonNumber);
      if (!lesson) continue;
      const displayOrder = row.displayOrder ?? nextOrderByLesson[String(lesson._id)]++;
      await ctx.db.insert("predefinedMessages", {
        lessonId: lesson._id,
        content: row.content,
        messageType: row.messageType,
        displayOrder,
        createdBy: createdByUserId,
        createdAt: Date.now(),
        isActive: true,
      });
      createdMessages++;
    }

    return { createdLessons, createdMessages };
  },
});
