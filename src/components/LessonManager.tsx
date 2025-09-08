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
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLesson) {
        await updateLesson({
          id: editingLesson,
          title: formData.title,
          description: formData.description,
        });
        toast.success("Lesson updated successfully");
      } else {
        await createLesson({
          studyBookId,
          lessonNumber: formData.lessonNumber,
          title: formData.title,
          description: formData.description,
        });
        toast.success("Lesson created successfully");
      }
      resetForm();
    } catch (error) {
      toast.error("Failed to save lesson");
    }
  };

  const resetForm = () => {
    setFormData({
      lessonNumber: lessons.length + 1,
      title: "",
      description: "",
    });
    setEditingLesson(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Back button and actions */}
      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-900"
        >
          ← Back to Study Books
        </button>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Lesson
        </button>
      </div>

      {/* Lesson Form - Similar to template form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">
            {editingLesson ? "Edit Lesson" : "Add New Lesson"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lesson Number *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.lessonNumber}
                  onChange={(e) => setFormData({ ...formData, lessonNumber: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!!editingLesson} // Can't change lesson number when editing
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., The Heart of a Man"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of the lesson..."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingLesson ? "Update" : "Create"}
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

      {/* Lessons List - Ordered by lesson number */}
      <div className="space-y-4">
        {lessons
          .sort((a, b) => a.lessonNumber - b.lessonNumber)
          .map((lesson) => (
            <div key={lesson._id} className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      Lesson {lesson.lessonNumber}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900">{lesson.title}</h3>
                  </div>
                  {lesson.description && (
                    <p className="text-gray-600 text-sm">{lesson.description}</p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => onSelectLesson(lesson._id)}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
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
                      });
                      setShowForm(true);
                    }}
                    className="text-blue-600 hover:text-blue-900 text-sm"
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
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        
        {lessons.length === 0 && (
          <div className="bg-white p-8 rounded-lg border shadow-sm text-center text-gray-500">
            No lessons yet. Add your first lesson to get started.
          </div>
        )}
      </div>
    </div>
  );
}