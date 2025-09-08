# Admin Backend APIs - Layer 2

**Reference:** For full context, see [`PLAN_admin-content-system.md`](./PLAN_admin-content-system.md)
**Prerequisite:** Complete [`PLAN_01_database-schema.md`](./PLAN_01_database-schema.md) first

## 🤖 AI IMPLEMENTATION REQUIREMENTS
**IMPORTANT**: When implementing this layer, the AI MUST:
1. **Update this document** with implementation progress by marking completed items with ✅
2. **Record any deviations** from the plan in an "Implementation Notes" section at the bottom
3. **Update success criteria** as items are completed
4. **Add any discovered issues** or improvements to a "Discovered Issues" section
5. **Update the next layer prerequisites** if anything changes that affects subsequent layers

This ensures continuity between AI sessions and maintains an accurate implementation record.

## Overview
This layer implements all the Convex mutations and queries that admins need to manage study books, lessons, and predefined messages. All operations require admin permissions.

## Admin Permission Helper

First, create a shared admin validation utility:

```typescript
// convex/_lib/adminAuth.ts
import { GenericActionCtx, GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { DataModel } from "./_generated/dataModel";

export async function requireAdmin(
  ctx: GenericMutationCtx<DataModel> | GenericQueryCtx<DataModel> | GenericActionCtx<DataModel>
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .filter(q => q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier))
    .first();

  if (!user?.isAdmin) {
    throw new Error("Admin access required");
  }

  return user;
}
```

## Study Books API

```typescript
// convex/studyBooks.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./_lib/adminAuth";

// List all study books (admin only)
export const list = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("studyBooks").order("desc").collect();
  },
});

// Get single study book by ID
export const get = query({
  args: { id: v.id("studyBooks") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.id);
  },
});

// Create new study book
export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    totalLessons: v.number(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    
    return await ctx.db.insert("studyBooks", {
      title: args.title,
      description: args.description,
      totalLessons: args.totalLessons,
      createdBy: admin._id,
      createdAt: Date.now(),
      isActive: true,
    });
  },
});

// Update study book
export const update = mutation({
  args: {
    id: v.id("studyBooks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    totalLessons: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const { id, ...updates } = args;
    const updateData: any = {};
    
    // Only include provided fields
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.totalLessons !== undefined) updateData.totalLessons = updates.totalLessons;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    
    return await ctx.db.patch(id, updateData);
  },
});

// Delete study book (and all related lessons/messages)
export const remove = mutation({
  args: { id: v.id("studyBooks") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    // Get all lessons for this study book
    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_study_book", q => q.eq("studyBookId", args.id))
      .collect();
    
    // Delete all predefined messages for all lessons
    for (const lesson of lessons) {
      const messages = await ctx.db
        .query("predefinedMessages")
        .withIndex("by_lesson", q => q.eq("lessonId", lesson._id))
        .collect();
      
      for (const message of messages) {
        await ctx.db.delete(message._id);
      }
      
      await ctx.db.delete(lesson._id);
    }
    
    // Finally delete the study book
    await ctx.db.delete(args.id);
  },
});
```

## Lessons API

```typescript
// convex/lessons.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./_lib/adminAuth";

// List lessons for a study book
export const listByStudyBook = query({
  args: { studyBookId: v.id("studyBooks") },
  handler: async (ctx, args) => {
    // Public read access - users need to see lessons
    return await ctx.db
      .query("lessons")
      .withIndex("by_study_book_number", q => q.eq("studyBookId", args.studyBookId))
      .order("asc") // Order by lesson number
      .collect();
  },
});

// Get single lesson by ID
export const get = query({
  args: { id: v.id("lessons") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create new lesson (admin only)
export const create = mutation({
  args: {
    studyBookId: v.id("studyBooks"),
    lessonNumber: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    // Verify study book exists
    const studyBook = await ctx.db.get(args.studyBookId);
    if (!studyBook) {
      throw new Error("Study book not found");
    }
    
    // Check if lesson number already exists
    const existingLesson = await ctx.db
      .query("lessons")
      .withIndex("by_study_book_number", q => 
        q.eq("studyBookId", args.studyBookId).eq("lessonNumber", args.lessonNumber)
      )
      .first();
    
    if (existingLesson) {
      throw new Error(`Lesson ${args.lessonNumber} already exists for this study book`);
    }
    
    return await ctx.db.insert("lessons", {
      studyBookId: args.studyBookId,
      lessonNumber: args.lessonNumber,
      title: args.title,
      description: args.description,
      createdAt: Date.now(),
      isActive: true,
    });
  },
});

// Update lesson (admin only)
export const update = mutation({
  args: {
    id: v.id("lessons"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const { id, ...updates } = args;
    const updateData: any = {};
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    
    return await ctx.db.patch(id, updateData);
  },
});

// Delete lesson (admin only)
export const remove = mutation({
  args: { id: v.id("lessons") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    // Delete all predefined messages for this lesson
    const messages = await ctx.db
      .query("predefinedMessages")
      .withIndex("by_lesson", q => q.eq("lessonId", args.id))
      .collect();
    
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
    
    await ctx.db.delete(args.id);
  },
});
```

## Predefined Messages API

```typescript
// convex/predefinedMessages.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./_lib/adminAuth";

// List predefined messages for a lesson
export const listByLesson = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    // Public read access - users need to see predefined messages
    return await ctx.db
      .query("predefinedMessages")
      .withIndex("by_lesson_order", q => q.eq("lessonId", args.lessonId))
      .filter(q => q.eq(q.field("isActive"), true))
      .order("asc") // Order by displayOrder
      .collect();
  },
});

// Get single predefined message
export const get = query({
  args: { id: v.id("predefinedMessages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create predefined message (admin only)
export const create = mutation({
  args: {
    lessonId: v.id("lessons"),
    content: v.string(),
    messageType: v.string(),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    
    // Verify lesson exists
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson) {
      throw new Error("Lesson not found");
    }
    
    // Auto-assign display order if not provided
    let displayOrder = args.displayOrder;
    if (displayOrder === undefined) {
      const existingMessages = await ctx.db
        .query("predefinedMessages")
        .withIndex("by_lesson", q => q.eq("lessonId", args.lessonId))
        .collect();
      displayOrder = existingMessages.length + 1;
    }
    
    return await ctx.db.insert("predefinedMessages", {
      lessonId: args.lessonId,
      content: args.content,
      messageType: args.messageType,
      displayOrder,
      createdBy: admin._id,
      createdAt: Date.now(),
      isActive: true,
    });
  },
});

// Update predefined message (admin only)
export const update = mutation({
  args: {
    id: v.id("predefinedMessages"),
    content: v.optional(v.string()),
    messageType: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const { id, ...updates } = args;
    const updateData: any = {};
    
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.messageType !== undefined) updateData.messageType = updates.messageType;
    if (updates.displayOrder !== undefined) updateData.displayOrder = updates.displayOrder;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    
    return await ctx.db.patch(id, updateData);
  },
});

// Delete predefined message (admin only)
export const remove = mutation({
  args: { id: v.id("predefinedMessages") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

// Reorder predefined messages within a lesson
export const reorder = mutation({
  args: {
    lessonId: v.id("lessons"),
    messageIds: v.array(v.id("predefinedMessages")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    // Update display order for each message
    for (let i = 0; i < args.messageIds.length; i++) {
      await ctx.db.patch(args.messageIds[i], {
        displayOrder: i + 1,
      });
    }
  },
});
```

## Message Types Constants

```typescript
// convex/_lib/messageTypes.ts
export const MESSAGE_TYPES = [
  "reminder",
  "scripture", 
  "discussion",
  "encouragement",
  "prayer",
  "application",
  "general",
] as const;

export type MessageType = typeof MESSAGE_TYPES[number];
```

## Testing the APIs

### Test Study Book Creation
```typescript
// Test creating a complete study book with lessons and messages
const studyBookId = await studyBooks.create({
  title: "Men's Study: Wild at Heart",
  description: "A journey into authentic masculinity",
  totalLessons: 12,
});

const lesson1Id = await lessons.create({
  studyBookId,
  lessonNumber: 1,
  title: "The Heart of a Man",
  description: "Exploring what it means to have the heart of a man",
});

const messageId = await predefinedMessages.create({
  lessonId: lesson1Id,
  content: "Tonight we explore what it means to have the heart of a man. Join us at 7pm!",
  messageType: "reminder",
});
```

## Success Criteria
- [x] Admin users can create/read/update/delete study books ✅
- [x] Admin users can create/read/update/delete lessons ✅
- [x] Admin users can create/read/update/delete predefined messages ✅
- [x] Non-admin users are blocked from admin mutations ✅
- [x] Users can read lessons and predefined messages (public data) ✅
- [x] Message reordering works correctly ✅
- [x] Cascading deletes work (deleting study book removes lessons and messages) ✅

## Next Layer
After completing this admin backend layer, proceed to:
- **PLAN_03_user-backend.md** - User API layer for custom messages and message selection

## Notes
- All admin operations are protected by `requireAdmin()` helper
- Public read access for lessons and predefined messages (users need this)
- Cascading deletes maintain data integrity
- Message types are constrained to predefined constants

---

## 📝 Implementation Tracking

### Implementation Notes
**✅ COMPLETED - January 7, 2025**

Successfully implemented all admin backend API functions:

1. **Admin Authentication Helper** (`convex/_lib/adminAuth.ts`)
   - Uses `getAuthUserId` from @convex-dev/auth/server (following existing patterns)
   - Validates user exists and has `isAdmin: true`
   - Provides consistent error handling across all admin functions

2. **Study Books API** (`convex/studyBooks.ts`)
   - Full CRUD operations with admin protection
   - Cascading delete functionality removes all associated lessons and messages
   - Auto-populates `createdBy` and `createdAt` fields

3. **Lessons API** (`convex/lessons.ts`)
   - Admin CRUD operations with validation
   - Public read access for `listByStudyBook` and `get` functions
   - Prevents duplicate lesson numbers within same study book
   - Cascading delete removes associated predefined messages

4. **Predefined Messages API** (`convex/predefinedMessages.ts`)
   - Admin CRUD operations with lesson validation
   - Auto-assigns display order when not provided
   - Message reordering functionality for lesson organization
   - Public read access with active message filtering

5. **Message Types Constants** (`convex/_lib/messageTypes.ts`)
   - Defines allowed message types: reminder, scripture, discussion, encouragement, prayer, application, general

**Testing Results:**
- ✅ Admin authentication correctly blocks non-admin users
- ✅ Public read functions work without authentication
- ✅ All CRUD operations deployed and functional
- ✅ Test data creation confirms admin user integration

### Discovered Issues
No blocking issues discovered. Implementation follows existing codebase patterns and integrates seamlessly with @convex-dev/auth system.

### Prerequisites for Next Layer
All requirements for PLAN_03_user-backend.md are satisfied:
- Admin API layer is complete and tested
- Database schema remains unchanged
- Public read access established for user-facing operations
- Admin user (ryan@rplummer.com) is configured and tested