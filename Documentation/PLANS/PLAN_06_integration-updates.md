# Integration Updates - Layer 6

**Reference:** For full context, see [`PLAN_admin-content-system.md`](./PLAN_admin-content-system.md)
**Prerequisites:** Complete all previous layers [`PLAN_01`](./PLAN_01_database-schema.md) through [`PLAN_05`](./PLAN_05_user-frontend.md)

## 🤖 AI IMPLEMENTATION REQUIREMENTS
**IMPORTANT**: When implementing this layer, the AI MUST:
1. **Update this document** with implementation progress by marking completed items with ✅
2. **Record any deviations** from the plan in an "Implementation Notes" section at the bottom
3. **Update success criteria** as items are completed
4. **Add any discovered issues** or improvements to a "Discovered Issues" section
5. **Update the next layer prerequisites** if anything changes that affects subsequent layers

This ensures continuity between AI sessions and maintains an accurate implementation record.

## Overview
This layer updates existing components to integrate with the new lesson-based system. The goal is to enhance existing functionality while maintaining backwards compatibility with the current message scheduling system.

## Component Updates Required

### 1. Update message-form-dialog.tsx

**Current State:** Template selection dropdown
**Enhancement:** Add lesson context and support for selected messages

```typescript
// src/components/message-form-dialog.tsx - Key updates

export interface MessageFormData {
  contactId?: string;
  groupId?: string;
  templateId?: string;
  // New fields for lesson integration
  selectedMessageId?: string; // Reference to userSelectedMessages
  lessonId?: string;
  messageSource?: "template" | "predefined" | "custom";
  message: string;
  scheduledFor: string;
  notes?: string;
  category?: string;
  messageType: "individual" | "group";
}

export function MessageFormDialog({
  open,
  onOpenChange,
  message,
  onSubmit,
  isSubmitting = false,
}: MessageFormDialogProps) {
  const contacts = useQuery(api.contacts.list) || [];
  const groups = useQuery(api.groups.list) || [];
  const templates = useQuery(api.messageTemplates.list) || []; // Keep for backwards compatibility
  
  // New queries for lesson integration
  const studyBooks = useQuery(api.studyBooks.list) || [];
  const lessons = formData.studyBookId 
    ? useQuery(api.lessons.listByStudyBook, { studyBookId: formData.studyBookId }) || []
    : [];
  const selectedMessages = formData.lessonId
    ? useQuery(api.userSelectedMessages.getForLesson, { lessonId: formData.lessonId }) || []
    : [];

  const [formData, setFormData] = useState<MessageFormData>({
    contactId: "",
    groupId: "",
    templateId: "none",
    selectedMessageId: "none", // New field
    lessonId: "",
    studyBookId: "",
    messageSource: "template", // New field to track source
    message: "",
    scheduledFor: "",
    notes: "",
    category: "none",
    messageType: "individual",
  });

  // Enhanced template/message selection handler
  const handleMessageSourceChange = (sourceType: "template" | "lesson") => {
    setFormData(prev => ({ 
      ...prev, 
      messageSource: sourceType,
      templateId: "none",
      selectedMessageId: "none",
      message: "",
    }));
  };

  const handleSelectedMessageChange = (selectedMessageId: string) => {
    setFormData(prev => ({ ...prev, selectedMessageId }));
    if (selectedMessageId !== "none") {
      const selectedMessage = selectedMessages.find(sm => sm._id === selectedMessageId);
      if (selectedMessage) {
        setFormData(prev => ({ 
          ...prev, 
          message: selectedMessage.messageContent || "",
          messageSource: selectedMessage.messageType === "predefined" ? "predefined" : "custom"
        }));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Existing dialog header */}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Existing message type and contact/group selection */}
          
          {/* Enhanced message source selection */}
          <div className="space-y-4">
            <Label>Message Source</Label>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="template"
                  checked={formData.messageSource === "template"}
                  onChange={(e) => handleMessageSourceChange("template")}
                />
                <span>Template (Legacy)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="lesson"
                  checked={formData.messageSource === "lesson"}
                  onChange={(e) => handleMessageSourceChange("lesson")}
                />
                <span>Study Lesson</span>
              </label>
            </div>
          </div>

          {/* Legacy template selection - keep for backwards compatibility */}
          {formData.messageSource === "template" && (
            <div className="space-y-2">
              <Label htmlFor="template">Template (Optional)</Label>
              <Select
                value={formData.templateId}
                onValueChange={handleTemplateChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No Template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Template</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template._id} value={template._id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* New lesson-based message selection */}
          {formData.messageSource === "lesson" && (
            <div className="space-y-4">
              {/* Study book selection */}
              <div className="space-y-2">
                <Label htmlFor="studyBook">Study Book</Label>
                <Select
                  value={formData.studyBookId}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    studyBookId: value, 
                    lessonId: "", 
                    selectedMessageId: "none" 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select study book" />
                  </SelectTrigger>
                  <SelectContent>
                    {studyBooks.map((book) => (
                      <SelectItem key={book._id} value={book._id}>
                        {book.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lesson selection */}
              {formData.studyBookId && (
                <div className="space-y-2">
                  <Label htmlFor="lesson">Lesson</Label>
                  <Select
                    value={formData.lessonId}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      lessonId: value, 
                      selectedMessageId: "none" 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select lesson" />
                    </SelectTrigger>
                    <SelectContent>
                      {lessons.map((lesson) => (
                        <SelectItem key={lesson._id} value={lesson._id}>
                          Lesson {lesson.lessonNumber}: {lesson.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Selected message selection */}
              {formData.lessonId && selectedMessages.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="selectedMessage">Your Selected Messages</Label>
                  <Select
                    value={formData.selectedMessageId}
                    onValueChange={handleSelectedMessageChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose from your selected messages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Write custom message</SelectItem>
                      {selectedMessages.map((sm) => (
                        <SelectItem key={sm._id} value={sm._id}>
                          {sm.messageType === "predefined" ? "📋" : "✍️"} {sm.messageContent?.substring(0, 50)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Info about selected messages */}
              {formData.lessonId && selectedMessages.length === 0 && (
                <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800">
                  💡 No messages selected for this lesson yet. Visit the "Study Messages" tab to select messages first.
                </div>
              )}
            </div>
          )}

          {/* Existing form fields (scheduled time, category, notes) */}
          
          {/* Enhanced message content field */}
          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder={
                formData.messageSource === "lesson" 
                  ? "Select a message above or write your own..."
                  : "Enter your message..."
              }
              required
            />
            {/* Show source indicator */}
            {formData.selectedMessageId !== "none" && (
              <div className="text-xs text-gray-600">
                Source: {formData.messageSource === "predefined" ? "Predefined message" : "Custom message"}
              </div>
            )}
          </div>
          
          {/* Existing dialog footer */}
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 2. Update messages-data-table.tsx

**Current State:** Status and category filtering
**Enhancement:** Add lesson filtering and message source indicators

```typescript
// src/components/messages-data-table.tsx - Key updates

export function MessagesDataTable<TData, TValue>({
  columns,
  data,
  onNewMessage,
  isLoading = false,
}: DataTableProps<TData, TValue>) {
  // Existing state
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "scheduledFor", desc: false }
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  
  // New lesson-based filtering
  const [lessonFilter, setLessonFilter] = React.useState<string>("all");
  const [messageSourceFilter, setMessageSourceFilter] = React.useState<string>("all");

  // Load study books and lessons for filtering
  const studyBooks = useQuery(api.studyBooks.list) || [];
  const lessons = React.useMemo(() => {
    const allLessons: any[] = [];
    studyBooks.forEach(book => {
      const bookLessons = api.lessons.listByStudyBook({ studyBookId: book._id }) || [];
      allLessons.push(...bookLessons);
    });
    return allLessons;
  }, [studyBooks]);

  // Apply lesson filter
  React.useEffect(() => {
    if (lessonFilter === "all") {
      table.getColumn("lessonId")?.setFilterValue(undefined);
    } else {
      table.getColumn("lessonId")?.setFilterValue(lessonFilter);
    }
  }, [lessonFilter, table]);

  // Apply message source filter
  React.useEffect(() => {
    if (messageSourceFilter === "all") {
      table.getColumn("messageSource")?.setFilterValue(undefined);
    } else {
      table.getColumn("messageSource")?.setFilterValue(messageSourceFilter);
    }
  }, [messageSourceFilter, table]);

  // Get unique lesson contexts from data
  const lessonContexts = React.useMemo(() => {
    const contexts = new Set<string>();
    data.forEach((item: any) => {
      if (item.lessonId) {
        contexts.add(item.lessonId);
      }
    });
    return Array.from(contexts);
  }, [data]);

  // Enhanced stats calculation
  const pendingCount = data.filter((item: any) => item.status === "pending").length;
  const sentCount = data.filter((item: any) => item.status === "sent").length;
  const failedCount = data.filter((item: any) => item.status === "failed").length;
  const lessonBasedCount = data.filter((item: any) => item.messageSource === "predefined" || item.messageSource === "custom").length;
  const templateBasedCount = data.filter((item: any) => item.messageSource === "template").length;

  return (
    <div className="w-full space-y-4">
      {/* Enhanced header with new stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Scheduled Messages</h2>
          <div className="flex gap-4 mt-2">
            <Badge variant="outline" className="bg-yellow-50">
              {pendingCount} Pending
            </Badge>
            <Badge variant="outline" className="bg-green-50">
              {sentCount} Sent
            </Badge>
            {failedCount > 0 && (
              <Badge variant="outline" className="bg-red-50">
                {failedCount} Failed
              </Badge>
            )}
            {lessonBasedCount > 0 && (
              <Badge variant="outline" className="bg-blue-50">
                {lessonBasedCount} Study-Based
              </Badge>
            )}
            {templateBasedCount > 0 && (
              <Badge variant="outline" className="bg-purple-50">
                {templateBasedCount} Template-Based
              </Badge>
            )}
          </div>
        </div>
        <Button onClick={onNewMessage} className="gap-2">
          <Plus className="h-4 w-4" />
          Schedule Message
        </Button>
      </div>

      {/* Enhanced filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search messages..."
            value={(table.getColumn("message")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("message")?.setFilterValue(event.target.value)
            }
            className="pl-10"
          />
        </div>
        
        {/* Existing status filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        {/* New lesson filter */}
        {lessonContexts.length > 0 && (
          <Select value={lessonFilter} onValueChange={setLessonFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Lesson" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Lessons</SelectItem>
              {lessonContexts.map((lessonId) => {
                const lesson = lessons.find(l => l._id === lessonId);
                return (
                  <SelectItem key={lessonId} value={lessonId}>
                    {lesson ? `Lesson ${lesson.lessonNumber}` : "Unknown Lesson"}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}

        {/* New message source filter */}
        <Select value={messageSourceFilter} onValueChange={setMessageSourceFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="template">Templates</SelectItem>
            <SelectItem value="predefined">Predefined</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>

        {/* Existing category and columns filters */}
        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              Columns <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Rest of existing table structure */}
    </div>
  );
}
```

### 3. Update message-columns.tsx

**Enhancement:** Add lesson context and message source to column definitions

```typescript
// src/components/message-columns.tsx - Key updates

export interface ScheduledMessage {
  _id: string;
  message: string;
  scheduledFor: number;
  status: "pending" | "sent" | "failed";
  contact?: { name: string; phoneNumber: string };
  group?: { name: string; memberCount: number };
  template?: { _id: string; name: string };
  // New fields for lesson integration
  lessonId?: string;
  lessonNumber?: number;
  lessonTitle?: string;
  messageSource?: "template" | "predefined" | "custom";
  originalMessageId?: string; // Reference to predefined or custom message
  category?: string;
  notes?: string;
}

export const columns: ColumnDef<ScheduledMessage>[] = [
  // Existing columns (select, message, recipient, etc.)
  
  // New lesson context column
  {
    accessorKey: "lesson",
    header: "Lesson",
    cell: ({ row }) => {
      const lessonNumber = row.original.lessonNumber;
      const lessonTitle = row.original.lessonTitle;
      
      if (lessonNumber && lessonTitle) {
        return (
          <div className="font-medium">
            <div className="text-sm text-gray-900">
              Lesson {lessonNumber}
            </div>
            <div className="text-xs text-gray-500 truncate max-w-[150px]">
              {lessonTitle}
            </div>
          </div>
        );
      }
      
      return <span className="text-gray-400">—</span>;
    },
  },

  // New message source column
  {
    accessorKey: "messageSource",
    header: "Source",
    cell: ({ row }) => {
      const source = row.original.messageSource;
      
      const sourceConfig = {
        template: { label: "Template", color: "bg-purple-100 text-purple-800", icon: "📄" },
        predefined: { label: "Predefined", color: "bg-green-100 text-green-800", icon: "📋" },
        custom: { label: "Custom", color: "bg-blue-100 text-blue-800", icon: "✍️" },
      };
      
      const config = sourceConfig[source as keyof typeof sourceConfig] || 
        { label: "Unknown", color: "bg-gray-100 text-gray-600", icon: "❓" };
      
      return (
        <Badge variant="outline" className={config.color}>
          {config.icon} {config.label}
        </Badge>
      );
    },
  },

  // Existing columns (scheduled for, status, actions)
];
```

### 4. Backend Integration for Scheduled Messages

**New Query:** Enhanced scheduled messages with lesson context

```typescript
// convex/scheduledMessages.ts - Enhancement

export const list = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const messages = await ctx.db
      .query("scheduledMessages")
      .filter(q => q.eq(q.field("userId"), identity.subject))
      .order("desc")
      .collect();

    // Enhance with lesson context
    const enhancedMessages = await Promise.all(
      messages.map(async (message) => {
        let lessonContext = null;
        
        // Check if message came from user selected messages
        if (message.selectedMessageId) {
          const selection = await ctx.db.get(message.selectedMessageId);
          if (selection && selection.lessonId) {
            const lesson = await ctx.db.get(selection.lessonId);
            if (lesson) {
              lessonContext = {
                lessonId: lesson._id,
                lessonNumber: lesson.lessonNumber,
                lessonTitle: lesson.title,
              };
            }
          }
        }

        return {
          ...message,
          ...lessonContext,
        };
      })
    );

    return enhancedMessages;
  },
});

// New mutation: Create scheduled message from selected message
export const createFromSelected = mutation({
  args: {
    selectedMessageId: v.id("userSelectedMessages"),
    contactId: v.optional(v.id("contacts")),
    groupId: v.optional(v.id("groups")),
    scheduledFor: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get the selected message
    const selectedMessage = await ctx.db.get(args.selectedMessageId);
    if (!selectedMessage || selectedMessage.userId !== identity.subject) {
      throw new Error("Selected message not found or access denied");
    }

    // Get the actual message content
    let messageContent = "";
    let messageSource = "custom";

    if (selectedMessage.predefinedMessageId) {
      const predefinedMessage = await ctx.db.get(selectedMessage.predefinedMessageId);
      if (predefinedMessage) {
        messageContent = predefinedMessage.content;
        messageSource = "predefined";
      }
    } else if (selectedMessage.customMessageId) {
      const customMessage = await ctx.db.get(selectedMessage.customMessageId);
      if (customMessage) {
        messageContent = customMessage.content;
        messageSource = "custom";
      }
    }

    if (!messageContent) {
      throw new Error("Message content not found");
    }

    // Create scheduled message
    const scheduledMessageId = await ctx.db.insert("scheduledMessages", {
      userId: identity.subject as Id<"users">,
      contactId: args.contactId,
      groupId: args.groupId,
      message: messageContent,
      scheduledFor: args.scheduledFor,
      selectedMessageId: args.selectedMessageId,
      messageSource,
      notes: args.notes,
      status: "pending",
      createdAt: Date.now(),
    });

    // Update the selected message to mark it as scheduled
    await ctx.db.patch(args.selectedMessageId, {
      scheduledAt: args.scheduledFor,
      isScheduled: true,
    });

    return scheduledMessageId;
  },
});
```

## Success Criteria
- [ ] Message dialog supports both legacy templates and new lesson-based messages
- [ ] Message table shows lesson context and message source
- [ ] Filtering works correctly for lessons and message sources
- [ ] Selected messages can be directly scheduled from dialog
- [ ] Backwards compatibility maintained for existing templates
- [ ] New message source indicators are clear and helpful
- [ ] Enhanced statistics provide useful insights

## Next Layer
After completing this integration layer, proceed to:
- **PLAN_07_data-migration.md** - Final layer for migrating existing data

## Notes
- Maintains full backwards compatibility with existing templates
- Gradual migration path allows users to continue using old system
- Enhanced filtering and visualization improve user experience
- Direct integration between lesson selection and message scheduling
- Clear visual indicators help users understand message sources

---

## 📝 Implementation Tracking

### Implementation Notes
*AI implementations should record any deviations, challenges, or improvements here*

### Discovered Issues
*Any issues discovered during implementation should be documented here*

### Prerequisites for Next Layer
*Any changes that affect PLAN_07_data-migration.md should be noted here*