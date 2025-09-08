# Church Study Book Content System

## Document Overview
- **System Architecture** - Single church study book content management
- **User Role Management** - Admin and user permissions
- **Lesson Structure** - Study book lesson organization with predefined messages
- **Message Management** - Predefined messages per lesson + custom message limits
- **Admin Planning Interface** - Web interface for content planning
- **Implementation Considerations** - Database design and message constraints
- **Migration Strategy** - Adding lesson-based content system

---

## System Architecture

### Single Church Study Book Model
The system focuses on one study book with lesson-based content structure:

**Study Book Content (Admin-Managed)**
- Single study book organized by lessons
- Each lesson contains multiple predefined message options
- Created and maintained by church administrator
- Available to all church members using the application
- Immutable predefined messages (read-only to users)

**User Message Selection**
- Users can select from predefined messages for each lesson
- Users can create up to 2 custom messages per lesson (280 character limit)
- Personal message scheduling and contact management
- Custom messages are fully user-owned and editable

**Message Structure Per Lesson**
- Admin-created predefined message options (unlimited)
- User-selected predefined messages for their schedule
- User custom messages (max 2 per lesson, 280 char limit)
- All messages tied to specific study book lessons

## User Role Management

### Role Hierarchy
```
Admin (Platform Owner)
└── User (Content Consumer)
```

### Permission Matrix
| Feature | Admin | User |
|---------|-------|------|
| Create Global Content | ✓ | - |
| Publish Global Content | ✓ | - |
| Edit Published Content | ✓ | - |
| Delete Global Content | ✓ | - |
| View Usage Analytics | ✓ | - |
| Browse Global Content | ✓ | ✓ |
| Adopt Global Content | ✓ | ✓ |
| Customize Global Content | ✓ | ✓ |
| Create Personal Content | ✓ | ✓ |
| Manage Personal Templates | ✓ | ✓ |

## Lesson Structure

### Study Book Organization
```
Study Book (e.g., "Men's Study: [Book Name]")
├── Lesson 1
│   ├── Predefined Messages (Admin-created, unlimited)
│   │   ├── Main lesson reminder
│   │   ├── Scripture focus message  
│   │   ├── Discussion prompt
│   │   └── Encouragement message
│   └── User Custom Messages (max 2, 280 chars each)
├── Lesson 2
│   ├── Predefined Messages
│   └── User Custom Messages
└── [Continue for all lessons...]
```

### Message Types Per Lesson
**Predefined Messages (Admin-Created)**
- Main lesson content messages
- Scripture reference reminders
- Discussion questions and prompts
- Encouragement and motivation messages
- Prayer focus messages
- Application/action step reminders

**Custom Messages (User-Created)**
- Personal reflections or insights
- Local group-specific information
- Personal encouragement messages
- Follow-up reminders or questions
- Maximum 2 per lesson, 280 character limit

## Content Distribution

### Content Discovery
**Browse Interface**
- Organized by curriculum, topic, or difficulty level
- Search functionality across all admin content
- Featured content and recommendations
- Recently updated content highlighting

**Content Preview**
- Full message preview before selection
- Estimated message length and character count
- Suggested scheduling recommendations
- Usage statistics and user ratings

### Selection and Adoption
**One-Click Adoption**
- Users can instantly add admin content to their personal template library
- Content becomes a user template (editable copy)
- Maintains reference to original admin content for updates

**Bulk Selection**
- Select entire lesson series or curriculum packages
- Choose specific message types (lessons only, follow-ups only, etc.)
- Import with predetermined scheduling suggestions

**Customization During Adoption**
- Modify content during the import process
- Add personal touches while maintaining core message
- Set default variables (church name, leader name, etc.)

## Customization Options

### Variable System
**Admin-Defined Variables**
- Placeholders for church/organization name
- Leader name and contact information
- Meeting times and locations
- Curriculum-specific terminology

**User-Configurable Elements**
- Personal greeting styles
- Signature preferences
- Additional context or local information
- Contact-specific personalizations

### Content Modification Levels
**Light Customization**
- Variable substitution only
- Maintains admin content integrity
- Updates flow from admin to user copies

**Moderate Customization**
- Edit specific sections while preserving structure
- Add personal anecdotes or local references
- Modify formatting and emphasis

**Full Customization**
- Complete message rewrite using admin content as starting point
- Breaks connection to admin updates
- Becomes fully user-owned content

## Implementation Considerations

### Database Schema Extensions

**New Tables Required:**
```
studyBooks
├── id: Study book identifier
├── title: Study book name (e.g., "Men's Study: [Book Name]")
├── description: Study book description
├── totalLessons: Number of lessons in the book
├── createdBy: Admin user reference
├── createdAt: Creation timestamp
└── isActive: Published status

lessons
├── id: Lesson identifier
├── studyBookId: Reference to study book
├── lessonNumber: Sequential lesson number (1, 2, 3...)
├── title: Lesson title
├── description: Lesson description
├── createdAt: Creation timestamp
└── isActive: Published status

predefinedMessages
├── id: Message identifier
├── lessonId: Reference to lesson
├── content: Message content (no character limit)
├── messageType: Type (reminder, scripture, discussion, encouragement, etc.)
├── displayOrder: Order within lesson
├── createdBy: Admin user reference
├── createdAt: Creation timestamp
└── isActive: Published status

userCustomMessages
├── id: User custom message identifier
├── userId: User who created the message
├── lessonId: Reference to lesson
├── content: Custom message content (280 character limit enforced)
├── createdAt: Creation timestamp
└── lastModified: Last edit timestamp

userSelectedMessages
├── id: Selection record identifier
├── userId: User who selected the message
├── predefinedMessageId: Reference to predefined message (nullable)
├── customMessageId: Reference to custom message (nullable)
├── scheduledAt: When message is scheduled to send
└── isScheduled: Whether message is actively scheduled

users (extended)
├── existing user fields...
└── isAdmin: Boolean flag for admin privileges
```

**Index Considerations:**
- Fast lookup by lesson for predefined messages browsing
- Efficient user custom message count checking (2 per lesson limit)
- Simple admin flag checking for permissions
- User message scheduling and selection tracking

### Security Implications

**Content Integrity**
- Admin content should be immutable to end users
- Version control for admin content updates
- Audit trails for all admin content changes

**Access Control**
- Simple admin flag-based permissions at database level
- API endpoint security for admin functions
- Admin content visible to all users, editable only by admin

**Data Isolation**
- Predefined messages exist in global scope (visible to all users)
- User custom messages remain user-scoped and private
- Clear separation between admin and user content
- Enforce 2 custom message limit per lesson per user
- Validate 280 character limit on custom message content

## Use Case Examples

### Church Men's Study Platform
**Structure:**
- Study Book: "Men's Study: Wild at Heart"
  - Lesson 1: "The Heart of a Man"
    - Predefined Messages (Admin-created):
      - "Tonight we explore what it means to have the heart of a man. Join us at 7pm!"
      - "Scripture focus: Genesis 2:15 - 'The Lord God took the man and put him in Eden to work it and keep it.'"
      - "Discussion: What does it mean to be truly alive as a man?"
      - "Remember: God created you for adventure, battle, and beauty."
    - User Custom Messages (max 2, 280 chars):
      - "[User personal reflection or group-specific message]"
      - "[User follow-up or encouragement message]"

**Message Limits:**
- Predefined messages: Unlimited (admin-created)
- Custom messages: 2 per lesson per user, 280 characters each

## Migration Strategy

### Phase 1: Database & Admin Interface
1. **Database Setup:**
   - Add `isAdmin` boolean field to users table
   - Create studyBooks, lessons, predefinedMessages tables
   - Set up foreign key relationships and indexes
   
2. **Admin Interface Creation:**
   - Transform TemplatesTab.tsx → LessonContentTab.tsx
   - Build study book creation interface
   - Implement lesson navigation and management
   - Create predefined message CRUD operations
   - Add message type categorization

### Phase 2: User Interface & Custom Messages
1. **User Interface Creation:**
   - Build new StudyMessagesTab.tsx component
   - Implement lesson-based message browsing
   - Add predefined message adoption workflow
   - Create custom message creation interface
   
2. **Custom Message System:**
   - Add userCustomMessages table with constraints
   - Implement 2-message limit per lesson enforcement
   - Add 280-character validation (frontend + backend)
   - Build character counter and limit indicators

### Phase 3: Integration & Migration
1. **Message System Integration:**
   - Update message-form-dialog.tsx for lesson context
   - Enhance messages-data-table.tsx with lesson filtering
   - Add lesson context to scheduled messages
   - Preserve existing message scheduling workflow
   
2. **Data Migration:**
   - Create migration tool for existing templates
   - Provide admin interface for template-to-lesson assignment
   - Update existing scheduled messages with lesson context
   - Implement backwards compatibility layer

## Analytics and Reporting

### Admin Analytics
- Content usage statistics across all users
- Popular content identification
- User adoption rates by content type
- Geographic/demographic usage patterns

### Content Performance Metrics
- Message delivery success rates by admin content
- User customization frequency and types
- Content update acceptance rates
- User engagement with admin vs. personal content

### User Insights
- Most adopted content categories
- Customization patterns and preferences
- Content discovery methods and effectiveness
- User journey through curriculum content

## Component Evolution & Implementation

### Current Component Analysis
**Existing TemplatesTab.tsx Structure:**
- Template CRUD operations (create, read, update, delete)
- Category-based organization
- Card-based layout for template browsing
- Form-based template creation/editing
- Integration with message scheduling system

**What Gets Replaced vs. Evolved:**

#### TemplatesTab.tsx → LessonContentTab.tsx (Admin Only)
**Replaces:** Current template management interface  
**Evolves Into:** Lesson-based content management system  
**Key Changes:**
- Add lesson context selection before message creation
- Transform category field into message type dropdown
- Add study book creation/selection at top level
- Replace free-form templates with structured predefined messages
- Add lesson navigation sidebar
- Preserve existing CRUD patterns and form handling

#### New Component: StudyMessagesTab.tsx (Users Only)  
**Replaces:** Template selection for regular users  
**New Functionality:**
- Browse predefined messages by lesson
- One-click message adoption for scheduling
- Custom message creation section with 280-char limit
- Combined view of selected predefined + custom messages
- Lesson progress tracking

### Component Modification Details

#### message-form-dialog.tsx Updates
**Current Template Selection → Enhanced Message Selection:**
- Replace template dropdown with predefined message selection
- Add lesson context to message creation
- Implement custom message character counter
- Add custom message limit validation (2 per lesson)
- Preserve existing form patterns and validation

#### messages-data-table.tsx Enhancements  
**Category Filter → Lesson Filter:**
- Replace category filter dropdown with lesson filter
- Add message type badges (predefined vs. custom)
- Add lesson context to message display
- Preserve existing status filters and search functionality
- Add "Message Source" column (predefined/custom)

### Permission-Based Interface Rendering

#### Admin Users (isAdmin: true)
**Tab Structure:**
```
├── Scheduled Messages (existing)
├── Lesson Content (replaces Templates)
│   ├── Study Book Management
│   ├── Lesson Navigation
│   └── Predefined Message Creation
├── Contacts (existing)
└── Groups (existing)
```

#### Regular Users (isAdmin: false)
**Tab Structure:**
```
├── Scheduled Messages (existing)
├── Study Messages (new)
│   ├── Browse by Lesson
│   ├── Select Predefined Messages
│   └── Create Custom Messages (2 max per lesson)
├── Contacts (existing)
└── Groups (existing)
```

## Technical Implementation Strategy

### Database Migration from Templates to Lessons

#### Current messageTemplates Table Evolution
**Preserve Existing Data:**
```sql
-- Migration strategy for existing templates
-- Option 1: Migrate existing templates to "Legacy" lesson
-- Option 2: Provide admin interface to assign templates to lessons
-- Option 3: Create import tool for bulk lesson assignment
```

**New Schema Integration:**
- Existing templates become predefined messages
- Add lessonId foreign key to link templates to lessons
- Transform category field into messageType enum
- Preserve template content and metadata

#### Data Flow Changes

**Current Template Selection Flow:**
1. User opens message dialog
2. Selects from existing templates
3. Template content populates message field
4. User schedules message

**New Lesson-Based Flow:**
1. User selects lesson context
2. Views predefined messages for that lesson
3. Adopts predefined message or creates custom message
4. Custom messages enforced at 280 chars, max 2 per lesson
5. User schedules message with lesson context

### Character Limit Implementation

#### Custom Message Validation
**Frontend Validation:**
```typescript
// In StudyMessagesTab.tsx
const [customMessageCount, setCustomMessageCount] = useState(0)
const [messageContent, setMessageContent] = useState("")

const handleCustomMessageInput = (content: string) => {
  if (content.length <= 280) {
    setMessageContent(content)
  }
}

// Character counter display
const remainingChars = 280 - messageContent.length
const charsColor = remainingChars < 20 ? "text-red-500" : 
                   remainingChars < 50 ? "text-yellow-500" : "text-green-500"
```

**Backend Validation:**
```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  userCustomMessages: defineTable({
    userId: v.id("users"),
    lessonId: v.id("lessons"),
    content: v.string(), // Max 280 chars enforced in mutation
    createdAt: v.number(),
    lastModified: v.number(),
  })
    .index("by_user_lesson", ["userId", "lessonId"])
    .index("by_lesson", ["lessonId"]),
});

// convex/userCustomMessages.ts
export const create = mutation({
  args: {
    lessonId: v.id("lessons"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Validate character limit
    if (args.content.length > 280) {
      throw new Error("Custom messages cannot exceed 280 characters");
    }
    
    // Check user's existing custom message count for this lesson
    const existingCount = await ctx.db
      .query("userCustomMessages")
      .withIndex("by_user_lesson", q => q.eq("userId", identity.subject).eq("lessonId", args.lessonId))
      .collect();
    
    if (existingCount.length >= 2) {
      throw new Error("Maximum 2 custom messages allowed per lesson");
    }
    
    return await ctx.db.insert("userCustomMessages", {
      userId: identity.subject as Id<"users">,
      lessonId: args.lessonId,
      content: args.content,
      createdAt: Date.now(),
      lastModified: Date.now(),
    });
  },
});
```

### Integration Points

#### Existing Message Scheduling Integration
**Preserve Current Patterns:**
- Keep existing message-columns.tsx structure
- Maintain scheduled message data flow
- Add lesson context to scheduled messages
- Preserve contact/group message relationships

#### Template System Backwards Compatibility
**Migration Path:**
```typescript
// convex/migrations.ts - Data migration utilities
export const migrateTemplatesToPredefinedMessages = mutation({
  handler: async (ctx) => {
    // Create a "Legacy Templates" lesson if it doesn't exist
    const legacyLesson = await ctx.db.insert("lessons", {
      studyBookId: "legacy_study_book_id",
      lessonNumber: 0,
      title: "Legacy Templates",
      description: "Migrated from old template system",
      createdAt: Date.now(),
      isActive: true,
    });

    // Migrate existing templates to predefined messages
    const templates = await ctx.db.query("messageTemplates").collect();
    
    for (const template of templates) {
      await ctx.db.insert("predefinedMessages", {
        lessonId: legacyLesson,
        content: template.content,
        messageType: template.category || "general",
        displayOrder: 0,
        createdBy: template.createdBy,
        createdAt: template.createdAt,
        isActive: true,
      });
    }
  },
});
```

**Admin Migration Interface:**
- Provide admin tool to bulk-assign templates to lessons
- Allow admin to review and categorize migrated templates
- Option to preserve original template system alongside new system
- Gradual phase-out with user notification system

#### Search and Filtering Enhancements
**messages-data-table.tsx Updates:**
- Add lesson-based filtering alongside existing filters
- Maintain search functionality across message content
- Add message source indicators (predefined/custom/legacy template)
- Preserve pagination and sorting behavior

## User Experience Flow Examples

### Admin Workflow: Creating Lesson Content
1. **Study Book Setup:**
   - Admin navigates to "Lesson Content" tab
   - Creates new study book: "Men's Study: Wild at Heart"
   - Sets total lessons: 12
   - Adds book description and metadata

2. **Lesson Creation:**
   - Creates "Lesson 1: The Heart of a Man"
   - Adds lesson description and objectives
   - Sets lesson order and status

3. **Predefined Message Creation:**
   - Adds main lesson reminder: "Tonight we explore what it means to have the heart of a man. Join us at 7pm!"
   - Adds scripture message: "Scripture focus: Genesis 2:15..."
   - Adds discussion prompt: "What does it mean to be truly alive as a man?"
   - Categorizes each message by type (reminder, scripture, discussion)

### User Workflow: Selecting Messages for Lesson
1. **Browse Study Messages:**
   - User navigates to "Study Messages" tab
   - Sees lesson navigation: Lesson 1, 2, 3...
   - Selects "Lesson 1: The Heart of a Man"

2. **Message Selection:**
   - Views 4 predefined messages created by admin
   - Clicks "Use This Message" on scripture focus message
   - Message is adopted and available for scheduling

3. **Custom Message Creation:**
   - Creates custom message: "Don't forget to bring your book and a pen for notes!"
   - Character counter shows: 67/280 characters
   - Indicator shows: "Custom messages: 1/2 remaining for Lesson 1"

4. **Message Scheduling:**
   - Clicks "Schedule Message" from adopted or custom message
   - Existing message dialog opens with lesson context pre-filled
   - Schedules message for specific date/time to contacts

### Admin vs User Interface Separation

#### Component Rendering Logic
```typescript
// In main application component
const user = useQuery(api.users.current)
const isAdmin = user?.isAdmin || false

return (
  <div>
    <Tab value="messages">Scheduled Messages</Tab>
    {isAdmin ? (
      <Tab value="lessons">Lesson Content</Tab>
    ) : (
      <Tab value="study">Study Messages</Tab>
    )}
    <Tab value="contacts">Contacts</Tab>
    <Tab value="groups">Groups</Tab>
  </div>
)
```

#### Permission Enforcement
**Frontend Guards:**
- Hide admin-only components based on `isAdmin` flag
- Disable admin actions for regular users
- Show different interfaces for same data

**Backend Validation:**
- All admin mutation functions check `isAdmin` status
- Regular users cannot create/edit predefined messages
- Users can only modify their own custom messages
- Lesson and study book modifications restricted to admins

#### Navigation Differences
**Admin Navigation Experience:**
- "Lesson Content" tab for content management
- Full CRUD operations on predefined messages
- Study book and lesson management interfaces
- Usage analytics and admin reporting

**User Navigation Experience:**
- "Study Messages" tab for content consumption
- Read-only access to predefined messages
- Custom message creation with limits
- Lesson-based browsing and adoption

## Future Enhancements

### Advanced Features
- Message analytics and usage tracking
- Bulk lesson import/export functionality
- Message template variations
- Seasonal content planning tools

### User Experience Improvements
- Mobile-optimized lesson browsing
- Offline message creation and sync
- Message preview with contact personalization
- Automated lesson progression tracking