# Data Migration & Backwards Compatibility - Layer 7

**Reference:** For full context, see [`PLAN_admin-content-system.md`](./PLAN_admin-content-system.md)
**Prerequisites:** Complete all previous layers [`PLAN_01`](./PLAN_01_database-schema.md) through [`PLAN_06`](./PLAN_06_integration-updates.md)

## Overview
This final layer provides tools and strategies for migrating existing templates to the new lesson-based system while maintaining backwards compatibility. The migration can be gradual, allowing users to continue using the old system while transitioning to the new one.

## Migration Strategy

### Phase 1: Preserve Existing Data
Ensure all existing templates and scheduled messages continue to work unchanged.

### Phase 2: Create Migration Tools
Provide admin tools to convert templates to lesson-based content.

### Phase 3: User Transition Support
Help users migrate their workflows to the new system.

### Phase 4: Gradual Deprecation
Phase out old templates while maintaining data integrity.

## Migration Tools

### 1. Admin Migration Interface

**New Component:** `src/components/MigrationTools.tsx`

```typescript
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

export function MigrationTools() {
  const templates = useQuery(api.messageTemplates.list) || [];
  const studyBooks = useQuery(api.studyBooks.list) || [];
  const migrateTemplates = useMutation(api.migrations.migrateTemplatesToPredefined);
  const createLegacyLesson = useMutation(api.migrations.createLegacyLesson);
  
  const [selectedTemplates, setSelectedTemplates] = useState<Id<"messageTemplates">[]>([]);
  const [targetStudyBook, setTargetStudyBook] = useState<Id<"studyBooks"> | "">("");
  const [targetLesson, setTargetLesson] = useState<Id<"lessons"> | "">("");
  const [migrationMode, setMigrationMode] = useState<"legacy" | "specific">("legacy");

  const lessons = targetStudyBook 
    ? useQuery(api.lessons.listByStudyBook, { studyBookId: targetStudyBook }) || []
    : [];

  const handleBulkMigration = async () => {
    try {
      if (migrationMode === "legacy") {
        // Create a legacy lesson for all templates
        await createLegacyLesson();
        toast.success("Legacy lesson created for templates");
      } else if (targetStudyBook && targetLesson) {
        // Migrate selected templates to specific lesson
        await migrateTemplates({
          templateIds: selectedTemplates,
          targetLessonId: targetLesson,
        });
        toast.success(`Migrated ${selectedTemplates.length} templates to lesson`);
      } else {
        toast.error("Please select a target study book and lesson");
        return;
      }
      
      setSelectedTemplates([]);
    } catch (error: any) {
      toast.error(error.message || "Migration failed");
    }
  };

  const unmigratedTemplates = templates.filter(t => !t.migratedToLesson);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Template Migration Tools</h2>
        <p className="text-gray-600">
          Migrate existing templates to the new lesson-based system
        </p>
      </div>

      {/* Migration statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{templates.length}</div>
          <div className="text-sm text-blue-700">Total Templates</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">
            {templates.filter(t => t.migratedToLesson).length}
          </div>
          <div className="text-sm text-green-700">Migrated</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-600">{unmigratedTemplates.length}</div>
          <div className="text-sm text-yellow-700">Pending Migration</div>
        </div>
      </div>

      {unmigratedTemplates.length === 0 ? (
        <div className="bg-green-50 p-6 rounded-lg text-center">
          <p className="text-green-800 font-medium">✅ All templates have been migrated!</p>
        </div>
      ) : (
        <>
          {/* Migration mode selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Migration Options</h3>
            
            <div className="space-y-3">
              <label className="flex items-start space-x-3">
                <input
                  type="radio"
                  value="legacy"
                  checked={migrationMode === "legacy"}
                  onChange={(e) => setMigrationMode("legacy")}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">Create Legacy Lesson (Recommended)</div>
                  <div className="text-sm text-gray-600">
                    Create a special "Legacy Templates" lesson to house all existing templates.
                    Users can still access them while transitioning to the new system.
                  </div>
                </div>
              </label>
              
              <label className="flex items-start space-x-3">
                <input
                  type="radio"
                  value="specific"
                  checked={migrationMode === "specific"}
                  onChange={(e) => setMigrationMode("specific")}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">Assign to Specific Lesson</div>
                  <div className="text-sm text-gray-600">
                    Manually assign selected templates to a specific lesson in your study book.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Specific lesson assignment */}
          {migrationMode === "specific" && (
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Study Book
                  </label>
                  <select
                    value={targetStudyBook}
                    onChange={(e) => {
                      setTargetStudyBook(e.target.value);
                      setTargetLesson("");
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select study book...</option>
                    {studyBooks.map((book) => (
                      <option key={book._id} value={book._id}>
                        {book.title}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Lesson
                  </label>
                  <select
                    value={targetLesson}
                    onChange={(e) => setTargetLesson(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={!targetStudyBook}
                  >
                    <option value="">Select lesson...</option>
                    {lessons.map((lesson) => (
                      <option key={lesson._id} value={lesson._id}>
                        Lesson {lesson.lessonNumber}: {lesson.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Template selection */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Select Templates to Migrate</h3>
              <div className="space-x-2">
                <button
                  onClick={() => setSelectedTemplates(unmigratedTemplates.map(t => t._id))}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedTemplates([])}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear All
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {unmigratedTemplates.map((template) => (
                <div 
                  key={template._id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedTemplates.includes(template._id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                  onClick={() => {
                    if (selectedTemplates.includes(template._id)) {
                      setSelectedTemplates(prev => prev.filter(id => id !== template._id));
                    } else {
                      setSelectedTemplates(prev => [...prev, template._id]);
                    }
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{template.name}</h4>
                    <input
                      type="checkbox"
                      checked={selectedTemplates.includes(template._id)}
                      onChange={() => {}} // Handled by div onClick
                      className="pointer-events-none"
                    />
                  </div>
                  {template.category && (
                    <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded mb-2">
                      {template.category}
                    </span>
                  )}
                  <p className="text-sm text-gray-600 line-clamp-2">{template.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Migration action */}
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleBulkMigration}
              disabled={migrationMode === "specific" && (!targetStudyBook || !targetLesson || selectedTemplates.length === 0)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {migrationMode === "legacy" 
                ? "Create Legacy Lesson & Migrate All"
                : `Migrate ${selectedTemplates.length} Templates`
              }
            </button>
          </div>
        </>
      )}

      {/* Migration history/log */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium mb-2">Migration Notes</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Existing scheduled messages using templates will continue to work</li>
          <li>• Migrated templates become predefined messages in the new system</li>
          <li>• Original templates are preserved for rollback if needed</li>
          <li>• Users can still access legacy templates until you're ready to deprecate them</li>
        </ul>
      </div>
    </div>
  );
}
```

### 2. Backend Migration Mutations

**New File:** `convex/migrations.ts`

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./_lib/adminAuth";

// Create a legacy lesson for housing old templates
export const createLegacyLesson = mutation({
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);
    
    // Check if legacy study book already exists
    let legacyStudyBook = await ctx.db
      .query("studyBooks")
      .filter(q => q.eq(q.field("title"), "Legacy Templates"))
      .first();
    
    if (!legacyStudyBook) {
      // Create legacy study book
      const studyBookId = await ctx.db.insert("studyBooks", {
        title: "Legacy Templates",
        description: "Migrated templates from the old system",
        totalLessons: 1,
        createdBy: admin._id,
        createdAt: Date.now(),
        isActive: true,
      });
      legacyStudyBook = await ctx.db.get(studyBookId);
    }
    
    if (!legacyStudyBook) throw new Error("Failed to create legacy study book");
    
    // Check if legacy lesson already exists
    let legacyLesson = await ctx.db
      .query("lessons")
      .filter(q => 
        q.and(
          q.eq(q.field("studyBookId"), legacyStudyBook._id),
          q.eq(q.field("lessonNumber"), 0)
        )
      )
      .first();
    
    if (!legacyLesson) {
      // Create legacy lesson
      const lessonId = await ctx.db.insert("lessons", {
        studyBookId: legacyStudyBook._id,
        lessonNumber: 0, // Special lesson number for legacy
        title: "Legacy Templates",
        description: "Templates migrated from the old template system",
        createdAt: Date.now(),
        isActive: true,
      });
      legacyLesson = await ctx.db.get(lessonId);
    }
    
    if (!legacyLesson) throw new Error("Failed to create legacy lesson");
    
    // Migrate all unmigrated templates
    const templates = await ctx.db
      .query("messageTemplates")
      .filter(q => q.neq(q.field("migratedToLesson"), true))
      .collect();
    
    let migratedCount = 0;
    
    for (const template of templates) {
      // Create predefined message from template
      await ctx.db.insert("predefinedMessages", {
        lessonId: legacyLesson._id,
        content: template.content,
        messageType: template.category || "general",
        displayOrder: migratedCount + 1,
        createdBy: admin._id,
        createdAt: template.createdAt || Date.now(),
        isActive: true,
      });
      
      // Mark template as migrated
      await ctx.db.patch(template._id, {
        migratedToLesson: true,
        migratedLessonId: legacyLesson._id,
        migratedAt: Date.now(),
      });
      
      migratedCount++;
    }
    
    return {
      studyBookId: legacyStudyBook._id,
      lessonId: legacyLesson._id,
      migratedCount,
    };
  },
});

// Migrate specific templates to a specific lesson
export const migrateTemplatesToPredefined = mutation({
  args: {
    templateIds: v.array(v.id("messageTemplates")),
    targetLessonId: v.id("lessons"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    
    // Verify lesson exists
    const lesson = await ctx.db.get(args.targetLessonId);
    if (!lesson) {
      throw new Error("Target lesson not found");
    }
    
    // Get current predefined message count for ordering
    const existingMessages = await ctx.db
      .query("predefinedMessages")
      .withIndex("by_lesson", q => q.eq("lessonId", args.targetLessonId))
      .collect();
    
    let displayOrder = existingMessages.length + 1;
    let migratedCount = 0;
    
    for (const templateId of args.templateIds) {
      const template = await ctx.db.get(templateId);
      if (!template || template.migratedToLesson) continue;
      
      // Create predefined message from template
      await ctx.db.insert("predefinedMessages", {
        lessonId: args.targetLessonId,
        content: template.content,
        messageType: template.category || "general",
        displayOrder: displayOrder++,
        createdBy: admin._id,
        createdAt: template.createdAt || Date.now(),
        isActive: true,
      });
      
      // Mark template as migrated
      await ctx.db.patch(templateId, {
        migratedToLesson: true,
        migratedLessonId: args.targetLessonId,
        migratedAt: Date.now(),
      });
      
      migratedCount++;
    }
    
    return { migratedCount };
  },
});

// Get migration status
export const getMigrationStatus = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    
    const allTemplates = await ctx.db.query("messageTemplates").collect();
    const migratedTemplates = allTemplates.filter(t => t.migratedToLesson);
    
    const scheduledMessages = await ctx.db.query("scheduledMessages").collect();
    const templateBasedMessages = scheduledMessages.filter(m => m.templateId);
    const lessonBasedMessages = scheduledMessages.filter(m => m.selectedMessageId);
    
    return {
      templates: {
        total: allTemplates.length,
        migrated: migratedTemplates.length,
        pending: allTemplates.length - migratedTemplates.length,
      },
      scheduledMessages: {
        total: scheduledMessages.length,
        templateBased: templateBasedMessages.length,
        lessonBased: lessonBasedMessages.length,
      },
    };
  },
});

// Rollback migration (emergency function)
export const rollbackMigration = mutation({
  args: {
    lessonId: v.id("lessons"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    
    // Get all predefined messages for this lesson that were migrated from templates
    const predefinedMessages = await ctx.db
      .query("predefinedMessages")
      .withIndex("by_lesson", q => q.eq("lessonId", args.lessonId))
      .collect();
    
    // Find corresponding templates and unmark them as migrated
    const templates = await ctx.db
      .query("messageTemplates")
      .filter(q => q.eq(q.field("migratedLessonId"), args.lessonId))
      .collect();
    
    // Rollback templates
    for (const template of templates) {
      await ctx.db.patch(template._id, {
        migratedToLesson: undefined,
        migratedLessonId: undefined,
        migratedAt: undefined,
      });
    }
    
    // Delete the predefined messages
    for (const message of predefinedMessages) {
      await ctx.db.delete(message._id);
    }
    
    return {
      rolledBackTemplates: templates.length,
      deletedMessages: predefinedMessages.length,
    };
  },
});
```

### 3. Update messageTemplates Schema

**Schema Enhancement:** Add migration tracking fields

```typescript
// convex/schema.ts - Update messageTemplates table
messageTemplates: defineTable({
  name: v.string(),
  content: v.string(),
  category: v.optional(v.string()),
  createdBy: v.id("users"),
  createdAt: v.number(),
  // New migration tracking fields
  migratedToLesson: v.optional(v.boolean()),
  migratedLessonId: v.optional(v.id("lessons")),
  migratedAt: v.optional(v.number()),
})
  .index("by_creator", ["createdBy"])
  .index("by_migrated", ["migratedToLesson"]),
```

### 4. User Migration Guidance

**New Component:** `src/components/UserMigrationGuide.tsx`

```typescript
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function UserMigrationGuide() {
  const templates = useQuery(api.messageTemplates.list) || [];
  const studyBooks = useQuery(api.studyBooks.list) || [];
  const [showGuide, setShowGuide] = useState(false);

  const hasLegacyTemplates = templates.some(t => !t.migratedToLesson);
  const hasStudyBooks = studyBooks.length > 0;

  if (!hasLegacyTemplates && !hasStudyBooks) {
    return null; // No migration needed
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-blue-900 font-medium">📚 New Study-Based Messaging Available!</h3>
          <p className="text-blue-800 text-sm mt-1">
            We've introduced a new way to organize your messages by study lessons. 
            Your existing templates still work, but you can now access organized study content too!
          </p>
        </div>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium ml-4"
        >
          {showGuide ? "Hide" : "Learn More"}
        </button>
      </div>

      {showGuide && (
        <div className="mt-4 space-y-3 text-sm text-blue-800">
          <div>
            <strong>What's New:</strong>
            <ul className="list-disc list-inside mt-1 ml-4 space-y-1">
              <li>Browse messages organized by study book lessons</li>
              <li>Select from curated predefined messages for each lesson</li>
              <li>Create custom messages (2 per lesson, 280 characters each)</li>
              <li>Your existing templates continue to work as before</li>
            </ul>
          </div>
          
          <div>
            <strong>How to Get Started:</strong>
            <ol className="list-decimal list-inside mt-1 ml-4 space-y-1">
              <li>Click on the "Study Messages" tab</li>
              <li>Browse available study books and lessons</li>
              <li>Select predefined messages or create custom ones</li>
              <li>Schedule your selected messages from the main messages page</li>
            </ol>
          </div>
          
          <div className="bg-blue-100 p-3 rounded border">
            <strong>💡 Pro Tip:</strong> You can use both systems! Schedule messages from your 
            existing templates AND from the new study lessons. The message scheduling dialog 
            now supports both options.
          </div>
        </div>
      )}
    </div>
  );
}
```

## Backwards Compatibility Checklist

### ✅ Existing Data Preserved
- [ ] All existing templates remain accessible
- [ ] All existing scheduled messages continue to work
- [ ] All existing user data is preserved
- [ ] No data is deleted during migration

### ✅ Gradual Transition
- [ ] Users can continue using old templates
- [ ] New system runs alongside old system
- [ ] Message dialog supports both systems
- [ ] No forced migration for users

### ✅ Admin Control
- [ ] Admins can choose migration timing
- [ ] Migration can be done in batches
- [ ] Rollback capability exists
- [ ] Migration status is visible

## Testing the Migration

### 1. Pre-Migration Testing
```typescript
// Test existing functionality still works
const existingTemplate = await api.messageTemplates.create({
  name: "Test Template",
  content: "This is a test template",
  category: "Test"
});

const scheduledMessage = await api.scheduledMessages.create({
  templateId: existingTemplate,
  contactId: testContactId,
  scheduledFor: Date.now() + 3600000,
});

// Verify message can be sent successfully
```

### 2. Migration Testing
```typescript
// Test migration process
const migrationResult = await api.migrations.createLegacyLesson();
console.log(`Migrated ${migrationResult.migratedCount} templates`);

// Verify templates still accessible as predefined messages
const legacyMessages = await api.predefinedMessages.listByLesson({
  lessonId: migrationResult.lessonId
});
```

### 3. Post-Migration Testing
```typescript
// Test new system works
const selectedMessage = await api.userSelectedMessages.selectPredefined({
  predefinedMessageId: migratedTemplateMessageId
});

const newScheduledMessage = await api.scheduledMessages.createFromSelected({
  selectedMessageId: selectedMessage,
  contactId: testContactId,
  scheduledFor: Date.now() + 3600000,
});
```

## Success Criteria
- [ ] All existing templates continue to function
- [ ] Migration tools work correctly for admins
- [ ] Users can transition gradually to new system
- [ ] No data loss during migration process
- [ ] Rollback capability is available
- [ ] Both old and new systems coexist peacefully
- [ ] Performance is not impacted by dual systems

## Final Implementation Order

### Complete Layer-by-Layer Implementation
1. **Layer 1**: Database schema (foundation)
2. **Layer 2**: Admin backend APIs
3. **Layer 3**: User backend APIs
4. **Layer 4**: Admin frontend components
5. **Layer 5**: User frontend components
6. **Layer 6**: Integration updates
7. **Layer 7**: Data migration (this layer)

### Deployment Strategy
1. Deploy all layers 1-6 with migration tools
2. Test thoroughly in development/staging
3. Deploy to production with backwards compatibility
4. Use migration tools to gradually transition content
5. Monitor system performance and user adoption
6. Eventually deprecate old template system (optional)

---

## 🤖 AI IMPLEMENTATION REQUIREMENTS

**IMPORTANT**: Any AI continuing work on this project MUST follow these requirements when implementing Layer 7:

### Implementation Tracking
- [ ] ✅ Update each completed section with checkmarks in this document
- [ ] ✅ Record any deviations from the plan in "Implementation Notes" section below
- [ ] ✅ Update Success Criteria checklist as items are completed
- [ ] ✅ Add any discovered issues to "Discovered Issues" section below

### Progress Updates Required
When implementing this layer, update progress by:
1. **Mark completed items** with ✅ in all relevant checklists above
2. **Update component status** in the code section headers (e.g., "✅ COMPLETED: MigrationTools.tsx")
3. **Note any changes** in implementation approach or requirements
4. **Update success criteria** as features are built and tested

### Implementation Notes
*Add any deviations, changes, or important decisions made during implementation:*

### Discovered Issues
*Add any bugs, blockers, or unexpected challenges discovered during implementation:*

### Next Layer Prerequisites
If this layer is completed successfully, ensure:
- [ ] All migration tools are functional and tested
- [ ] Backwards compatibility is verified
- [ ] Admin has migration interface access
- [ ] Rollback capability is tested and working

---

## Notes
- Migration is optional and gradual
- System designed to run both old and new approaches indefinitely
- Users experience no disruption during migration
- Admin retains full control over migration timing and scope
- Complete rollback capability provides safety net