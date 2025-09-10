import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface StudyBookManagerProps {
  studyBooks: any[];
  onSelectStudyBook: (id: Id<"studyBooks">) => void;
}

export function StudyBookManager({ studyBooks, onSelectStudyBook }: StudyBookManagerProps) {
  const createStudyBook = useMutation(api.studyBooks.create);
  const updateStudyBook = useMutation(api.studyBooks.update);
  const removeStudyBook = useMutation(api.studyBooks.remove);

  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Id<"studyBooks"> | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    totalLessons: 12,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBook) {
        await updateStudyBook({
          id: editingBook,
          ...formData,
        });
        toast.success("Study book updated successfully");
      } else {
        await createStudyBook(formData);
        toast.success("Study book created successfully");
      }
      resetForm();
    } catch (error) {
      toast.error("Failed to save study book");
    }
  };

  const handleEdit = (book: any) => {
    setEditingBook(book._id);
    setFormData({
      title: book.title,
      description: book.description,
      totalLessons: book.totalLessons,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: Id<"studyBooks">) => {
    if (confirm("Are you sure? This will delete all lessons and messages in this study book.")) {
      try {
        await removeStudyBook({ id });
        toast.success("Study book deleted successfully");
      } catch (error) {
        toast.error("Failed to delete study book");
      }
    }
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", totalLessons: 12 });
    setEditingBook(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Add Study Book Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-colors"
        >
          Add Study Book
        </button>
      </div>

      {/* Study Book Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">
            {editingBook ? "Edit Study Book" : "Add New Study Book"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="e.g., Men's Study: Wild at Heart"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Description *
              </label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Brief description of the study book..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Total Lessons *
              </label>
              <input
                type="number"
                required
                min="1"
                max="52"
                value={formData.totalLessons}
                onChange={(e) => setFormData({ ...formData, totalLessons: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-colors"
              >
                {editingBook ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-muted text-foreground px-4 py-2 rounded-md hover:opacity-90 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Study Books Grid - Similar pattern to current TemplatesTab */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {studyBooks.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-lg border shadow-sm text-center text-gray-500">
            No study books yet. Create your first study book to get started.
          </div>
        ) : (
          studyBooks.map((book) => (
            <div key={book._id} className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-foreground">{book.title}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(book)}
                    className="text-primary hover:opacity-90 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(book._id)}
                    className="text-[hsl(var(--destructive))] hover:opacity-90 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{book.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{book.totalLessons} lessons</span>
                <button
                  onClick={() => onSelectStudyBook(book._id)}
                  className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm hover:opacity-90 transition-colors"
                >
                  Manage Lessons
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}