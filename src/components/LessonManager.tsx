import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface LessonManagerProps {
  studyBookId: Id<"studyBooks">;
  lessons: any[];
  onSelectLesson: (id: Id<"lessons">) => void;
  onBack: () => void;
}

import { LessonCsvImportButton } from "./LessonCsvImportModal";

export function LessonManager({ studyBookId, lessons, onSelectLesson, onBack }: LessonManagerProps) {
  const createLesson = useMutation(api.lessons.create);
  const updateLesson = useMutation(api.lessons.update);
  const removeLesson = useMutation(api.lessons.remove);

  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Id<"lessons"> | null>(null);
  const [formData, setFormData] = useState({
    lessonNumber: lessons.length + 1,
    title: "",
    description: "",
    activeWeekStart: "",
    defaultSendTime: "06:30",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLesson) {
        await updateLesson({
          id: editingLesson,
          title: formData.title,
          description: formData.description,
          activeWeekStart: formData.activeWeekStart ? new Date(formData.activeWeekStart).getTime() : undefined,
          defaultSendTime: formData.defaultSendTime || undefined,
        });
        toast.success("Lesson updated successfully");
      } else {
        await createLesson({
          studyBookId,
          lessonNumber: formData.lessonNumber,
          title: formData.title,
          description: formData.description || undefined,
          activeWeekStart: formData.activeWeekStart ? new Date(formData.activeWeekStart).getTime() : undefined,
          defaultSendTime: formData.defaultSendTime || undefined,
        });
        toast.success("Lesson created successfully");
      }
      resetForm();
    } catch (error: any) {
      const msg = typeof error?.message === 'string' ? error.message : 'Failed to save lesson';
      toast.error(msg);
    }
  };

  const resetForm = () => {
    setFormData({
      lessonNumber: lessons.length + 1,
      title: "",
      description: "",
      activeWeekStart: "",
      defaultSendTime: "06:30",
    });
    setEditingLesson(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Back button and actions */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <button
          onClick={onBack}
          className="text-primary hover:opacity-90 text-sm sm:text-base self-start"
        >
          ← Back to Study Books
        </button>
        <div className="flex items-stretch sm:items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-colors text-sm w-full sm:w-auto"
          >
            Add Lesson
          </button>
          <div className="w-full sm:w-auto">
            <LessonCsvImportButton studyBookId={studyBookId} />
          </div>
        </div>
      </div>

      {/* Lesson Form - Similar to template form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold mb-4">
            {editingLesson ? "Edit Lesson" : "Add New Lesson"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Lesson Number *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.lessonNumber}
                  onChange={(e) => setFormData({ ...formData, lessonNumber: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={!!editingLesson} // Can't change lesson number when editing
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., The Heart of a Man"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Brief description of the lesson..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Active Week Start (optional)
                </label>
                <input
                  type="date"
                  value={formData.activeWeekStart}
                  onChange={(e) => setFormData({ ...formData, activeWeekStart: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">Pick the Monday (or desired start) of the active week.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Default Send Time (optional)
                </label>
                <select
                  value={formData.defaultSendTime}
                  onChange={(e) => setFormData({ ...formData, defaultSendTime: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Array.from({ length: 96 }).map((_, idx) => {
                    const h = String(Math.floor(idx / 4)).padStart(2, '0')
                    const m = String((idx % 4) * 15).padStart(2, '0')
                    const val = `${h}:${m}`
                    return <option key={val} value={val}>{val}</option>
                  })}
                </select>
                <p className="text-xs text-muted-foreground mt-1">Used as the default time when users schedule messages.</p>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                type="submit"
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-colors text-sm sm:text-base"
              >
                {editingLesson ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-muted text-foreground px-4 py-2 rounded-md hover:opacity-90 transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lessons List - Ordered by lesson number */}
      <div className="space-y-4">
        {lessons
          .sort((a, b) => a.lessonNumber - b.lessonNumber)
          .map((lesson) => (
            <div key={lesson._id} className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] text-xs px-2 py-1 rounded-full">
                      Lesson {lesson.lessonNumber}
                    </span>
                    <h3 className="text-base sm:text-lg font-semibold text-foreground break-words">
                      {lesson.title}
                    </h3>
                  </div>
                  {lesson.description && (
                    <p className="text-muted-foreground text-sm whitespace-pre-wrap break-words">
                      {lesson.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 sm:ml-4 flex-wrap w-full sm:w-auto">
                  <button
                    onClick={() => onSelectLesson(lesson._id)}
                    className="bg-primary text-primary-foreground px-3 py-2 rounded text-sm hover:opacity-90 transition-colors w-full sm:w-auto"
                  >
                    Manage Messages
                  </button>
                  <button
                    onClick={() => {
                      setEditingLesson(lesson._id);
                      setFormData({
                        lessonNumber: lesson.lessonNumber,
                        title: lesson.title,
                        description: lesson.description || "",
                        activeWeekStart: lesson.activeWeekStart ? new Date(lesson.activeWeekStart - new Date(lesson.activeWeekStart).getTimezoneOffset()*60000).toISOString().slice(0,10) : "",
                        defaultSendTime: lesson.defaultSendTime || "06:30",
                      });
                      setShowForm(true);
                    }}
                    className="text-primary hover:opacity-90 text-sm w-full sm:w-auto"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm("Are you sure? This will delete all messages in this lesson.")) {
                        try {
                          await removeLesson({ id: lesson._id });
                          toast.success("Lesson deleted successfully");
                        } catch (error) {
                          toast.error("Failed to delete lesson");
                        }
                      }
                    }}
                    className="text-[hsl(var(--destructive))] hover:opacity-90 text-sm w-full sm:w-auto"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

        {lessons.length === 0 && (
          <div className="bg-white p-8 rounded-lg border shadow-sm text-center text-muted-foreground">
            No lessons yet. Add your first lesson to get started.
          </div>
        )}
      </div>
    </div>
  );
}
