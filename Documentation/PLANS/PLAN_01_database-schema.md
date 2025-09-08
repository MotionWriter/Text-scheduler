# Database Schema Implementation - Layer 1

**Reference:** For full context, see [`PLAN_admin-content-system.md`](./PLAN_admin-content-system.md)

## 🤖 AI IMPLEMENTATION REQUIREMENTS
**IMPORTANT**: When implementing this layer, the AI MUST:
1. **Update this document** with implementation progress by marking completed items with ✅
2. **Record any deviations** from the plan in an "Implementation Notes" section at the bottom
3. **Update success criteria** as items are completed
4. **Add any discovered issues** or improvements to a "Discovered Issues" section
5. **Update the next layer prerequisites** if anything changes that affects subsequent layers

This ensures continuity between AI sessions and maintains an accurate implementation record.

## Overview
This is the foundational layer that creates the database schema for the church study book content system. All other layers depend on this foundation being implemented first.

## Prerequisites
- Existing Convex database with users, messageTemplates tables
- Understanding of Convex schema definition and indexing

## Schema Extensions Required

### 1. Users Table Extension
Add admin flag to existing users table:

```typescript
// convex/schema.ts - Update existing users table
users: defineTable({
  // ... existing fields
  isAdmin: v.optional(v.boolean()), // Default false for existing users
}),
```

### 2. New Core Tables

```typescript
// convex/schema.ts - Add these new tables
export default defineSchema({
  // ... existing tables

  studyBooks: defineTable({
    title: v.string(), // "Men's Study: Wild at Heart"
    description: v.string(),
    totalLessons: v.number(),
    createdBy: v.id("users"), // Admin who created it
    createdAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_active", ["isActive"])
    .index("by_creator", ["createdBy"]),

  lessons: defineTable({
    studyBookId: v.id("studyBooks"),
    lessonNumber: v.number(), // Sequential: 1, 2, 3...
    title: v.string(), // "The Heart of a Man"
    description: v.optional(v.string()),
    createdAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_study_book", ["studyBookId"])
    .index("by_study_book_number", ["studyBookId", "lessonNumber"])
    .index("by_active", ["isActive"]),

  predefinedMessages: defineTable({
    lessonId: v.id("lessons"),
    content: v.string(), // No character limit for admin messages
    messageType: v.string(), // "reminder", "scripture", "discussion", "encouragement"
    displayOrder: v.number(), // Order within lesson
    createdBy: v.id("users"), // Admin who created it
    createdAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_lesson", ["lessonId"])
    .index("by_lesson_order", ["lessonId", "displayOrder"])
    .index("by_type", ["messageType"])
    .index("by_creator", ["createdBy"]),

  userCustomMessages: defineTable({
    userId: v.id("users"),
    lessonId: v.id("lessons"),
    content: v.string(), // 280 character limit enforced in mutations
    createdAt: v.number(),
    lastModified: v.number(),
  })
    .index("by_user_lesson", ["userId", "lessonId"])
    .index("by_lesson", ["lessonId"])
    .index("by_user", ["userId"]),

  userSelectedMessages: defineTable({
    userId: v.id("users"),
    predefinedMessageId: v.optional(v.id("predefinedMessages")),
    customMessageId: v.optional(v.id("userCustomMessages")),
    lessonId: v.id("lessons"), // Denormalized for easy querying
    scheduledAt: v.optional(v.number()), // When message is scheduled to send
    isScheduled: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user_lesson", ["userId", "lessonId"])
    .index("by_user_scheduled", ["userId", "isScheduled"])
    .index("by_lesson", ["lessonId"]),
});
```

## Key Schema Decisions

### Indexing Strategy
- **Performance Indexes**: Fast lookups by lesson for message browsing
- **User Constraint Indexes**: Efficient custom message count checking (2 per lesson limit)
- **Admin Workflow Indexes**: Quick access for content management

### Data Relationships
- `studyBooks` → `lessons` (one-to-many)
- `lessons` → `predefinedMessages` (one-to-many)
- `lessons` → `userCustomMessages` (one-to-many, per user)
- `userSelectedMessages` references both predefined and custom messages

### Constraint Enforcement
- **Custom Message Limits**: Enforced at application layer (max 2 per lesson per user)
- **Character Limits**: 280 characters enforced in mutations
- **Admin Permissions**: All admin actions require `isAdmin: true` check

## Database Migration Steps

### Step 1: Add isAdmin Field
```typescript
// This can be done via Convex dashboard or migration script
// All existing users default to isAdmin: false
// Manually set your user to isAdmin: true via dashboard
```

### Step 2: Deploy New Schema
```bash
# Deploy the new schema with new tables
npm run dev
# Convex will automatically create the new tables
```

### Step 3: Verify Schema
- Confirm all tables are created with correct indexes
- Verify foreign key relationships work
- Test basic insert/query operations

## Testing the Schema

### Basic Data Flow Test
1. Create a study book
2. Add lessons to the study book
3. Add predefined messages to lessons
4. Create user custom messages
5. Test user message selection records

### Sample Test Data
```typescript
// Sample data to validate schema works correctly
const studyBook = {
  title: "Men's Study: Wild at Heart",
  description: "A journey into authentic masculinity",
  totalLessons: 12,
  createdBy: adminUserId,
  createdAt: Date.now(),
  isActive: true,
};

const lesson1 = {
  studyBookId: studyBookId,
  lessonNumber: 1,
  title: "The Heart of a Man",
  description: "Exploring what it means to have the heart of a man",
  createdAt: Date.now(),
  isActive: true,
};

const predefinedMessage = {
  lessonId: lesson1Id,
  content: "Tonight we explore what it means to have the heart of a man. Join us at 7pm!",
  messageType: "reminder",
  displayOrder: 1,
  createdBy: adminUserId,
  createdAt: Date.now(),
  isActive: true,
};
```

## Success Criteria
- [x] All new tables created with proper indexes
- [x] Foreign key relationships work correctly  
- [x] Basic CRUD operations succeed on all tables
- [x] Admin user can be identified via `isAdmin` flag
- [x] Sample data can be inserted and queried successfully

## Next Layer
After completing this schema implementation, proceed to:
- **PLAN_02_admin-backend.md** - Admin API layer for managing study books and lessons

## Notes
- Keep existing `messageTemplates` table during transition
- New schema supports backwards compatibility
- All character limits and permission checks will be implemented in API layer

---

## 📝 Implementation Tracking

### Implementation Notes
**✅ COMPLETED - September 7, 2025**

**Schema Implementation Details:**
- Extended the users table from `@convex-dev/auth` to include `isAdmin` field
- Successfully added all 5 new core tables: `studyBooks`, `lessons`, `predefinedMessages`, `userCustomMessages`, `userSelectedMessages`
- All tables created with proper indexing strategy for performance
- Schema deployed successfully to Convex development environment
- Foreign key relationships established correctly between tables

**Implementation Approach:**
- Used table override pattern to extend auth users table without breaking existing authentication
- Maintained backward compatibility with existing tables (contacts, groups, messageTemplates, etc.)
- All new tables follow the established naming and indexing conventions

**Schema File Location:** `convex/schema.ts`

**Testing Results:**
- ✅ Successfully created 1 study book, 2 lessons, 2 predefined messages, 1 custom message, 1 user selection
- ✅ All foreign key relationships working properly (studyBooks → lessons → messages)
- ✅ Admin user properly identified with `isAdmin: true` flag
- ✅ CRUD operations tested via `convex/testData.ts` functions
- ✅ Index performance validated through queries
- ✅ Optional fields handling correctly (null/undefined values)

### Discovered Issues
*No significant issues discovered during implementation*

### Prerequisites for Next Layer
**Ready for PLAN_02_admin-backend.md:**
- Schema successfully deployed with all required tables
- Users table extended with `isAdmin` field for permission checking
- All indexes created for optimal query performance
- Development environment running at: https://dashboard.convex.dev/d/scrupulous-wren-82