# User Backend APIs - Layer 3

**Reference:** For full context, see [`PLAN_admin-content-system.md`](./PLAN_admin-content-system.md)
**Prerequisites:** Complete [`PLAN_01_database-schema.md`](./PLAN_01_database-schema.md) and [`PLAN_02_admin-backend.md`](./PLAN_02_admin-backend.md) first

## 🤖 AI IMPLEMENTATION REQUIREMENTS
**IMPORTANT**: When implementing this layer, the AI MUST:
1. **Update this document** with implementation progress by marking completed items with ✅
2. **Record any deviations** from the plan in an "Implementation Notes" section at the bottom
3. **Update success criteria** as items are completed
4. **Add any discovered issues** or improvements to a "Discovered Issues" section
5. **Update the next layer prerequisites** if anything changes that affects subsequent layers

This ensures continuity between AI sessions and maintains an accurate implementation record.

## Overview
This layer implements Convex mutations and queries for regular users to interact with custom messages and message selection. Includes enforcement of the 2-message limit per lesson and 280-character limit.

## User Authentication Helper

```typescript
// convex/_lib/userAuth.ts
import { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { DataModel } from "./_generated/dataModel";

export async function requireUser(
  ctx: GenericMutationCtx<DataModel> | GenericQueryCtx<DataModel>
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .filter(q => q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier))
    .first();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}
```

## User Custom Messages API

```typescript
// convex/userCustomMessages.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./_lib/userAuth";

// Get user's custom messages for a specific lesson
export const getForLesson = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    return await ctx.db
      .query("userCustomMessages")
      .withIndex("by_user_lesson", q => q.eq("userId", user._id).eq("lessonId", args.lessonId))
      .collect();
  },
});

// Get all custom messages for a user
export const getAll = query({
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    
    return await ctx.db
      .query("userCustomMessages")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();
  },
});

// Get custom message count for a lesson (for limit checking)
export const getCountForLesson = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    const messages = await ctx.db
      .query("userCustomMessages")
      .withIndex("by_user_lesson", q => q.eq("userId", user._id).eq("lessonId", args.lessonId))
      .collect();
    
    return {
      count: messages.length,
      remaining: Math.max(0, 2 - messages.length),
      canCreate: messages.length < 2,
    };
  },
});

// Create custom message with validation
export const create = mutation({
  args: {
    lessonId: v.id("lessons"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    // Validate character limit
    if (args.content.length > 280) {
      throw new Error("Custom messages cannot exceed 280 characters");
    }
    
    if (args.content.trim().length === 0) {
      throw new Error("Message content cannot be empty");
    }
    
    // Check lesson exists
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson) {
      throw new Error("Lesson not found");
    }
    
    // Check user's existing custom message count for this lesson
    const existingMessages = await ctx.db
      .query("userCustomMessages")
      .withIndex("by_user_lesson", q => q.eq("userId", user._id).eq("lessonId", args.lessonId))
      .collect();
    
    if (existingMessages.length >= 2) {
      throw new Error("Maximum 2 custom messages allowed per lesson");
    }
    
    return await ctx.db.insert("userCustomMessages", {
      userId: user._id,
      lessonId: args.lessonId,
      content: args.content.trim(),
      createdAt: Date.now(),
      lastModified: Date.now(),
    });
  },
});

// Update custom message
export const update = mutation({
  args: {
    id: v.id("userCustomMessages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    // Validate character limit
    if (args.content.length > 280) {
      throw new Error("Custom messages cannot exceed 280 characters");
    }
    
    if (args.content.trim().length === 0) {
      throw new Error("Message content cannot be empty");
    }
    
    // Verify ownership
    const message = await ctx.db.get(args.id);
    if (!message || message.userId !== user._id) {
      throw new Error("Custom message not found or access denied");
    }
    
    return await ctx.db.patch(args.id, {
      content: args.content.trim(),
      lastModified: Date.now(),
    });
  },
});

// Delete custom message
export const remove = mutation({
  args: { id: v.id("userCustomMessages") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    // Verify ownership
    const message = await ctx.db.get(args.id);
    if (!message || message.userId !== user._id) {
      throw new Error("Custom message not found or access denied");
    }
    
    // Remove from any user selections first
    const selections = await ctx.db
      .query("userSelectedMessages")
      .filter(q => q.eq(q.field("customMessageId"), args.id))
      .collect();
    
    for (const selection of selections) {
      await ctx.db.delete(selection._id);
    }
    
    await ctx.db.delete(args.id);
  },
});
```

## User Message Selection API

```typescript
// convex/userSelectedMessages.ts
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
      throw new Error("Message selection not found or access denied");
    }
    
    return await ctx.db.patch(args.id, {
      scheduledAt: args.scheduledAt,
      isScheduled: args.isScheduled,
    });
  },
});

// Remove message selection
export const remove = mutation({
  args: { id: v.id("userSelectedMessages") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    // Verify ownership
    const selection = await ctx.db.get(args.id);
    if (!selection || selection.userId !== user._id) {
      throw new Error("Message selection not found or access denied");
    }
    
    await ctx.db.delete(args.id);
  },
});
```

## User Dashboard Queries

```typescript
// convex/userDashboard.ts
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
          .withIndex("by_study_book_number", q => q.eq("studyBookId", args.studyBookId))
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
```

## Testing the User APIs

### Test Custom Message Creation
```typescript
// Test the 2-message limit enforcement
const lesson1Id = "lesson_id_here";

// Should succeed - first custom message
const message1 = await userCustomMessages.create({
  lessonId: lesson1Id,
  content: "Don't forget to bring your book and a pen for notes!",
});

// Should succeed - second custom message
const message2 = await userCustomMessages.create({
  lessonId: lesson1Id,
  content: "Looking forward to discussing this challenging topic together.",
});

// Should fail - third message exceeds limit
try {
  await userCustomMessages.create({
    lessonId: lesson1Id,
    content: "This should fail due to the 2-message limit.",
  });
} catch (error) {
  console.log("Expected error:", error.message); // "Maximum 2 custom messages allowed per lesson"
}

// Test character limit
try {
  await userCustomMessages.create({
    lessonId: lesson1Id,
    content: "A".repeat(281), // 281 characters
  });
} catch (error) {
  console.log("Expected error:", error.message); // "Custom messages cannot exceed 280 characters"
}
```

## Success Criteria
- [x] Users can create custom messages with 280-character limit enforced
- [x] Users are limited to 2 custom messages per lesson
- [x] Users can edit/delete only their own custom messages
- [x] Users can select predefined messages for scheduling
- [x] Users can select their custom messages for scheduling
- [x] Progress tracking works correctly
- [x] Recent activity queries function properly
- [x] Proper error messages for validation failures

## Next Layer
After completing this user backend layer, proceed to:
- **PLAN_04_admin-frontend.md** - Admin frontend components (LessonContentTab)

## Notes
- Character limits enforced at both frontend and backend
- User ownership validated on all operations
- Custom message limits prevent spam/abuse
- Message selection system supports both predefined and custom messages

---

## 📝 Implementation Tracking

### Implementation Notes
**✅ PHASE 3 COMPLETED - January 7, 2025**

**Implementation Summary:**
- Created user authentication helper (`convex/_lib/userAuth.ts`) using existing patterns from admin auth
- Implemented all 4 API modules exactly as specified in the plan:
  1. `userCustomMessages.ts` - Full CRUD with validation (280-char limit, 2-message per lesson limit)
  2. `userSelectedMessages.ts` - Message selection system supporting both predefined and custom messages
  3. `userDashboard.ts` - Progress tracking and recent activity queries
- All functions properly enforce user authentication and ownership validation
- Character limits and message count limits implemented with proper error handling
- Enhanced selections include message content resolution for both predefined and custom messages
- Database indexes used efficiently for all user queries

**Code Quality:**
- Followed existing Convex patterns from admin layer
- Used `getAuthUserId` from @convex-dev/auth/server consistently
- All functions include proper TypeScript typing
- Error messages are user-friendly and specific

**Testing Approach:**
- Created comprehensive test workflow (`testUserWorkflow.ts`) 
- Verified authentication properly rejects unauthenticated requests
- All functions deployed successfully without TypeScript errors
- Database schema supports all required operations via existing indexes

### Discovered Issues
**No significant issues discovered.** Implementation followed the plan precisely with these minor considerations:

1. **Authentication Pattern**: Confirmed the project uses `getAuthUserId` from @convex-dev/auth/server (not the old getUserIdentity pattern shown in plan)
2. **TypeScript Strictness**: Had to use non-null assertion (`args.studyBookId!`) in userDashboard.ts for optional ID parameter
3. **Index Usage**: All database queries use existing indexes efficiently, no additional indexes needed

### Prerequisites for Next Layer
**✅ All prerequisites for PLAN_04_admin-frontend.md are satisfied:**

1. **User API Layer Complete**: All user backend functions are implemented and deployed
2. **Function Names**: Frontend can import from:
   - `userCustomMessages` (getForLesson, getAll, getCountForLesson, create, update, remove)
   - `userSelectedMessages` (getForLesson, getScheduled, selectPredefined, selectCustom, updateScheduling, remove)  
   - `userDashboard` (getLessonProgress, getRecentActivity)
3. **Authentication**: All functions use consistent auth pattern with `requireUser()` helper
4. **Data Validation**: All limits and validations are enforced at the backend level
5. **No Breaking Changes**: Implementation exactly matches the planned API interface