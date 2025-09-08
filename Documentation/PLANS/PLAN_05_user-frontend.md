# User Frontend Components - Layer 5

**Reference:** For full context, see [`PLAN_admin-content-system.md`](./PLAN_admin-content-system.md)
**Prerequisites:** Complete [`PLAN_01_database-schema.md`](./PLAN_01_database-schema.md), [`PLAN_02_admin-backend.md`](./PLAN_02_admin-backend.md), [`PLAN_03_user-backend.md`](./PLAN_03_user-backend.md), and [`PLAN_04_admin-frontend.md`](./PLAN_04_admin-frontend.md) first

## 🤖 AI IMPLEMENTATION REQUIREMENTS
**IMPORTANT**: When implementing this layer, the AI MUST:
1. **Update this document** with implementation progress by marking completed items with ✅
2. **Record any deviations** from the plan in an "Implementation Notes" section at the bottom
3. **Update success criteria** as items are completed
4. **Add any discovered issues** or improvements to a "Discovered Issues" section
5. **Update the next layer prerequisites** if anything changes that affects subsequent layers

This ensures continuity between AI sessions and maintains an accurate implementation record.

## Overview
This layer creates the `StudyMessagesTab.tsx` component for regular users to browse predefined messages, create custom messages with limits, and select messages for scheduling. This replaces template selection functionality for non-admin users.

## Component Structure

### 1. Main StudyMessagesTab.tsx
**New Component:** `src/components/StudyMessagesTab.tsx`

```typescript
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { LessonSelector } from "./LessonSelector";
import { PredefinedMessageBrowser } from "./PredefinedMessageBrowser";
import { CustomMessageManager } from "./CustomMessageManager";
import { SelectedMessagesSummary } from "./SelectedMessagesSummary";

export function StudyMessagesTab() {
  const [selectedStudyBook, setSelectedStudyBook] = useState<Id<"studyBooks"> | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Id<"lessons"> | null>(null);
  const [activeView, setActiveView] = useState<"lessons" | "predefined" | "custom" | "selected">("lessons");

  const studyBooks = useQuery(api.studyBooks.list) || [];
  const lessons = selectedStudyBook 
    ? useQuery(api.lessons.listByStudyBook, { studyBookId: selectedStudyBook }) || []
    : [];

  // Auto-select first study book if only one exists
  useState(() => {
    if (studyBooks.length === 1 && !selectedStudyBook) {
      setSelectedStudyBook(studyBooks[0]._id);
    }
  }, [studyBooks]);

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">Study Messages</h2>
          <p className="text-gray-600">Browse and select messages for your lessons</p>
          
          {/* Progress indicator */}
          {selectedLesson && (
            <nav className="flex space-x-2 text-sm text-gray-600 mt-2">
              <button 
                onClick={() => setActiveView("lessons")}
                className={`hover:text-blue-600 ${activeView === "lessons" ? "font-medium text-blue-600" : ""}`}
              >
                Lessons
              </button>
              <span>/</span>
              <button 
                onClick={() => setActiveView("predefined")}
                className={`hover:text-blue-600 ${activeView === "predefined" ? "font-medium text-blue-600" : ""}`}
              >
                Predefined Messages
              </button>
              <span>/</span>
              <button 
                onClick={() => setActiveView("custom")}
                className={`hover:text-blue-600 ${activeView === "custom" ? "font-medium text-blue-600" : ""}`}
              >
                Custom Messages
              </button>
            </nav>
          )}
        </div>

        {/* Quick stats */}
        {selectedLesson && (
          <div className="text-right text-sm text-gray-600">
            <SelectedMessagesSummary lessonId={selectedLesson} />
          </div>
        )}
      </div>

      {/* Study book selector - hide if only one book */}
      {studyBooks.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Study Book
          </label>
          <select
            value={selectedStudyBook || ""}
            onChange={(e) => {
              setSelectedStudyBook(e.target.value as Id<"studyBooks">);
              setSelectedLesson(null);
              setActiveView("lessons");
            }}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a study book...</option>
            {studyBooks.map((book) => (
              <option key={book._id} value={book._id}>
                {book.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Content based on active view */}
      {activeView === "lessons" && selectedStudyBook && (
        <LessonSelector 
          studyBookId={selectedStudyBook}
          lessons={lessons}
          selectedLesson={selectedLesson}
          onSelectLesson={(lessonId) => {
            setSelectedLesson(lessonId);
            setActiveView("predefined");
          }}
        />
      )}

      {activeView === "predefined" && selectedLesson && (
        <PredefinedMessageBrowser 
          lessonId={selectedLesson}
          onNext={() => setActiveView("custom")}
          onBack={() => setActiveView("lessons")}
        />
      )}

      {activeView === "custom" && selectedLesson && (
        <CustomMessageManager 
          lessonId={selectedLesson}
          onNext={() => setActiveView("selected")}
          onBack={() => setActiveView("predefined")}
        />
      )}

      {activeView === "selected" && selectedLesson && (
        <SelectedMessagesSummary 
          lessonId={selectedLesson}
          detailed={true}
          onBack={() => setActiveView("custom")}
        />
      )}
    </div>
  );
}
```

### 2. LessonSelector.tsx
**New Component:** `src/components/LessonSelector.tsx`

```typescript
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface LessonSelectorProps {
  studyBookId: Id<"studyBooks">;
  lessons: any[];
  selectedLesson: Id<"lessons"> | null;
  onSelectLesson: (lessonId: Id<"lessons">) => void;
}

export function LessonSelector({ studyBookId, lessons, selectedLesson, onSelectLesson }: LessonSelectorProps) {
  const progress = useQuery(api.userDashboard.getLessonProgress, { studyBookId });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Select a Lesson</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lessons
          .sort((a, b) => a.lessonNumber - b.lessonNumber)
          .map((lesson) => {
            const lessonProgress = progress?.find(p => p.lesson._id === lesson._id);
            const isSelected = selectedLesson === lesson._id;
            const hasActivity = lessonProgress?.hasActivity || false;
            
            return (
              <div 
                key={lesson._id}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  isSelected 
                    ? "border-blue-500 bg-blue-50" 
                    : hasActivity
                      ? "border-green-200 bg-green-50 hover:border-green-300"
                      : "border-gray-200 bg-white hover:border-gray-300"
                }`}
                onClick={() => onSelectLesson(lesson._id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    hasActivity 
                      ? "bg-green-100 text-green-800" 
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    Lesson {lesson.lessonNumber}
                  </span>
                  {hasActivity && (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </div>
                
                <h4 className="font-medium text-gray-900 mb-2">{lesson.title}</h4>
                
                {lesson.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{lesson.description}</p>
                )}
                
                {lessonProgress && (
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Selected messages:</span>
                      <span className="font-medium">{lessonProgress.selectedMessagesCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Custom messages:</span>
                      <span className="font-medium">
                        {lessonProgress.customMessagesCount}/2
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
      
      {lessons.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No lessons available yet. Check back later!
        </div>
      )}
    </div>
  );
}
```

### 3. PredefinedMessageBrowser.tsx
**New Component:** `src/components/PredefinedMessageBrowser.tsx`

```typescript
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface PredefinedMessageBrowserProps {
  lessonId: Id<"lessons">;
  onNext: () => void;
  onBack: () => void;
}

export function PredefinedMessageBrowser({ lessonId, onNext, onBack }: PredefinedMessageBrowserProps) {
  const predefinedMessages = useQuery(api.predefinedMessages.listByLesson, { lessonId }) || [];
  const selectedMessages = useQuery(api.userSelectedMessages.getForLesson, { lessonId }) || [];
  const selectPredefined = useMutation(api.userSelectedMessages.selectPredefined);
  const removeSelection = useMutation(api.userSelectedMessages.remove);

  const [filter, setFilter] = useState<string>("all");

  const messageTypes = [...new Set(predefinedMessages.map(m => m.messageType))];
  
  const filteredMessages = filter === "all" 
    ? predefinedMessages 
    : predefinedMessages.filter(m => m.messageType === filter);

  const isMessageSelected = (messageId: Id<"predefinedMessages">) => {
    return selectedMessages.some(s => s.predefinedMessageId === messageId);
  };

  const getSelectionId = (messageId: Id<"predefinedMessages">) => {
    const selection = selectedMessages.find(s => s.predefinedMessageId === messageId);
    return selection?._id;
  };

  const handleToggleMessage = async (messageId: Id<"predefinedMessages">) => {
    try {
      if (isMessageSelected(messageId)) {
        // Remove selection
        const selectionId = getSelectionId(messageId);
        if (selectionId) {
          await removeSelection({ id: selectionId });
          toast.success("Message removed from selection");
        }
      } else {
        // Add selection
        await selectPredefined({ predefinedMessageId: messageId });
        toast.success("Message added to selection");
      }
    } catch (error) {
      toast.error("Failed to update message selection");
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation and filters */}
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-900 mb-2"
          >
            ← Back to Lessons
          </button>
          <h3 className="text-lg font-semibold">Predefined Messages</h3>
          <p className="text-sm text-gray-600">Select messages you'd like to use</p>
        </div>
        <button
          onClick={onNext}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Next: Custom Messages →
        </button>
      </div>

      {/* Message type filter */}
      {messageTypes.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === "all" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All ({predefinedMessages.length})
          </button>
          {messageTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1 rounded-full text-sm capitalize ${
                filter === type 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {type} ({predefinedMessages.filter(m => m.messageType === type).length})
            </button>
          ))}
        </div>
      )}

      {/* Messages grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMessages.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            {filter === "all" 
              ? "No predefined messages available for this lesson yet."
              : `No ${filter} messages available for this lesson.`
            }
          </div>
        ) : (
          filteredMessages.map((message) => {
            const isSelected = isMessageSelected(message._id);
            
            return (
              <div 
                key={message._id}
                className={`p-4 rounded-lg border transition-all ${
                  isSelected 
                    ? "border-green-500 bg-green-50" 
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full capitalize">
                    {message.messageType}
                  </span>
                  <button
                    onClick={() => handleToggleMessage(message._id)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      isSelected
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    {isSelected ? "Remove" : "Select"}
                  </button>
                </div>
                
                <p className="text-gray-700 text-sm leading-relaxed">{message.content}</p>
                
                <div className="mt-3 text-xs text-gray-500">
                  {message.content.length} characters
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

### 4. CustomMessageManager.tsx
**New Component:** `src/components/CustomMessageManager.tsx`

```typescript
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface CustomMessageManagerProps {
  lessonId: Id<"lessons">;
  onNext: () => void;
  onBack: () => void;
}

export function CustomMessageManager({ lessonId, onNext, onBack }: CustomMessageManagerProps) {
  const customMessages = useQuery(api.userCustomMessages.getForLesson, { lessonId }) || [];
  const messageCount = useQuery(api.userCustomMessages.getCountForLesson, { lessonId });
  const selectedMessages = useQuery(api.userSelectedMessages.getForLesson, { lessonId }) || [];
  
  const createCustomMessage = useMutation(api.userCustomMessages.create);
  const updateCustomMessage = useMutation(api.userCustomMessages.update);
  const removeCustomMessage = useMutation(api.userCustomMessages.remove);
  const selectCustom = useMutation(api.userSelectedMessages.selectCustom);
  const removeSelection = useMutation(api.userSelectedMessages.remove);

  const [showForm, setShowForm] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Id<"userCustomMessages"> | null>(null);
  const [messageContent, setMessageContent] = useState("");

  const canCreateMore = messageCount?.canCreate || false;
  const remaining = messageCount?.remaining || 0;

  const isMessageSelected = (messageId: Id<"userCustomMessages">) => {
    return selectedMessages.some(s => s.customMessageId === messageId);
  };

  const getSelectionId = (messageId: Id<"userCustomMessages">) => {
    const selection = selectedMessages.find(s => s.customMessageId === messageId);
    return selection?._id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (messageContent.trim().length === 0) {
      toast.error("Message cannot be empty");
      return;
    }

    try {
      if (editingMessage) {
        await updateCustomMessage({
          id: editingMessage,
          content: messageContent.trim(),
        });
        toast.success("Custom message updated");
      } else {
        await createCustomMessage({
          lessonId,
          content: messageContent.trim(),
        });
        toast.success("Custom message created");
      }
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to save custom message");
    }
  };

  const handleToggleSelection = async (messageId: Id<"userCustomMessages">) => {
    try {
      if (isMessageSelected(messageId)) {
        const selectionId = getSelectionId(messageId);
        if (selectionId) {
          await removeSelection({ id: selectionId });
          toast.success("Message removed from selection");
        }
      } else {
        await selectCustom({ customMessageId: messageId });
        toast.success("Message added to selection");
      }
    } catch (error) {
      toast.error("Failed to update message selection");
    }
  };

  const handleDelete = async (messageId: Id<"userCustomMessages">) => {
    if (confirm("Are you sure you want to delete this custom message?")) {
      try {
        await removeCustomMessage({ id: messageId });
        toast.success("Custom message deleted");
      } catch (error) {
        toast.error("Failed to delete custom message");
      }
    }
  };

  const resetForm = () => {
    setMessageContent("");
    setEditingMessage(null);
    setShowForm(false);
  };

  const remainingChars = 280 - messageContent.length;
  const charsColor = remainingChars < 20 ? "text-red-500" : 
                     remainingChars < 50 ? "text-yellow-500" : "text-green-500";

  return (
    <div className="space-y-6">
      {/* Navigation and header */}
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-900 mb-2"
          >
            ← Back to Predefined Messages
          </button>
          <h3 className="text-lg font-semibold">Custom Messages</h3>
          <p className="text-sm text-gray-600">
            Create your own messages (2 maximum per lesson, 280 characters each)
          </p>
        </div>
        <button
          onClick={onNext}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Review Selections →
        </button>
      </div>

      {/* Usage indicator */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Custom Messages Used</span>
          <span className={`text-sm font-bold ${remaining === 0 ? "text-red-600" : "text-green-600"}`}>
            {customMessages.length}/2
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${
              customMessages.length === 2 ? "bg-red-500" : "bg-green-500"
            }`}
            style={{ width: `${(customMessages.length / 2) * 100}%` }}
          ></div>
        </div>
        {remaining > 0 && (
          <p className="text-xs text-gray-600 mt-1">
            You can create {remaining} more custom message{remaining !== 1 ? 's' : ''} for this lesson
          </p>
        )}
      </div>

      {/* Add message button/form */}
      {canCreateMore && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
        >
          + Add Custom Message
        </button>
      )}

      {/* Message form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h4 className="text-lg font-semibold mb-4">
            {editingMessage ? "Edit Custom Message" : "Create Custom Message"}
          </h4>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Content *
              </label>
              <textarea
                required
                rows={4}
                value={messageContent}
                onChange={(e) => {
                  if (e.target.value.length <= 280) {
                    setMessageContent(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Write your custom message here..."
              />
              <div className={`text-right text-sm mt-1 ${charsColor}`}>
                {remainingChars} characters remaining
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                disabled={messageContent.trim().length === 0}
              >
                {editingMessage ? "Update" : "Create"} Message
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Custom messages list */}
      <div className="space-y-4">
        {customMessages.map((message) => {
          const isSelected = isMessageSelected(message._id);
          
          return (
            <div 
              key={message._id}
              className={`p-4 rounded-lg border transition-all ${
                isSelected 
                  ? "border-green-500 bg-green-50" 
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                  Custom
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleSelection(message._id)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      isSelected
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    {isSelected ? "Remove" : "Select"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingMessage(message._id);
                      setMessageContent(message.content);
                      setShowForm(true);
                    }}
                    className="text-blue-600 hover:text-blue-900 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(message._id)}
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              <p className="text-gray-700 text-sm leading-relaxed mb-2">{message.content}</p>
              
              <div className="text-xs text-gray-500">
                {message.content.length}/280 characters
              </div>
            </div>
          );
        })}
        
        {customMessages.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No custom messages yet. Create your first custom message above!
          </div>
        )}
      </div>
    </div>
  );
}
```

### 5. SelectedMessagesSummary.tsx
**New Component:** `src/components/SelectedMessagesSummary.tsx`

```typescript
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface SelectedMessagesSummaryProps {
  lessonId: Id<"lessons">;
  detailed?: boolean;
  onBack?: () => void;
}

export function SelectedMessagesSummary({ lessonId, detailed = false, onBack }: SelectedMessagesSummaryProps) {
  const selectedMessages = useQuery(api.userSelectedMessages.getForLesson, { lessonId }) || [];
  const predefinedCount = selectedMessages.filter(m => m.messageType === "predefined").length;
  const customCount = selectedMessages.filter(m => m.messageType === "custom").length;
  const totalCount = selectedMessages.length;

  if (!detailed) {
    // Compact summary for header display
    return (
      <div className="text-sm">
        <div>Selected: {totalCount} messages</div>
        <div className="text-xs text-gray-500">
          {predefinedCount} predefined, {customCount} custom
        </div>
      </div>
    );
  }

  // Detailed view
  return (
    <div className="space-y-6">
      {onBack && (
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-900"
        >
          ← Back to Custom Messages
        </button>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-2">Selected Messages Summary</h3>
        <p className="text-gray-600">
          Review your selected messages for this lesson. You can schedule these from the main messages page.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
          <div className="text-sm text-blue-700">Total Selected</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{predefinedCount}</div>
          <div className="text-sm text-green-700">Predefined</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600">{customCount}</div>
          <div className="text-sm text-purple-700">Custom</div>
        </div>
      </div>

      {/* Messages list */}
      <div className="space-y-4">
        <h4 className="font-medium">Your Selected Messages:</h4>
        
        {selectedMessages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No messages selected yet. Go back and select some messages!
          </div>
        ) : (
          selectedMessages.map((selection, index) => (
            <div 
              key={selection._id}
              className={`p-4 rounded-lg border ${
                selection.messageType === "predefined" 
                  ? "border-green-200 bg-green-50" 
                  : "border-purple-200 bg-purple-50"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`inline-block text-xs px-2 py-1 rounded-full ${
                  selection.messageType === "predefined"
                    ? "bg-green-100 text-green-800"
                    : "bg-purple-100 text-purple-800"
                }`}>
                  {selection.messageType === "predefined" ? "Predefined" : "Custom"}
                </span>
                <span className="text-xs text-gray-500">#{index + 1}</span>
              </div>
              
              <p className="text-gray-700 text-sm leading-relaxed">
                {selection.messageContent}
              </p>
              
              {selection.isScheduled && (
                <div className="mt-2 text-xs text-blue-600">
                  ✓ Already scheduled
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Next steps */}
      {selectedMessages.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Next Steps:</h4>
          <p className="text-sm text-blue-800">
            Go to the "Scheduled Messages" tab to schedule when these messages should be sent to your contacts.
          </p>
        </div>
      )}
    </div>
  );
}
```

## Integration with Main App

### Update Main Navigation
```typescript
// In your main app component
const user = useQuery(api.users.current)
const isAdmin = user?.isAdmin || false

// Tab rendering
{!isAdmin && <Tab value="study">Study Messages</Tab>}

// Content rendering
{activeTab === "study" && !isAdmin && <StudyMessagesTab />}
```

## Success Criteria
- [ ] Regular users see "Study Messages" tab instead of "Templates"
- [ ] Lesson selection works with progress tracking
- [ ] Predefined message browsing and selection functions correctly
- [ ] Custom message creation enforces 280-character and 2-per-lesson limits  
- [ ] Character counter provides real-time feedback
- [ ] Message selection/deselection works for both predefined and custom messages
- [ ] Summary view shows accurate counts and message details
- [ ] Responsive design works on mobile and desktop
- [ ] Proper error handling for all validation failures

## Next Layer
After completing this user frontend layer, proceed to:
- **PLAN_06_integration-updates.md** - Updates to existing components for lesson integration

## Notes
- Component follows guided workflow: lessons → predefined → custom → summary
- Character counter provides real-time visual feedback  
- Progress tracking shows user activity across lessons
- All limits enforced at both frontend and backend levels
- Integrates seamlessly with existing message scheduling system

---

## 📝 Implementation Tracking

### Implementation Notes
*AI implementations should record any deviations, challenges, or improvements here*

### Discovered Issues
*Any issues discovered during implementation should be documented here*

### Prerequisites for Next Layer
*Any changes that affect PLAN_06_integration-updates.md should be noted here*