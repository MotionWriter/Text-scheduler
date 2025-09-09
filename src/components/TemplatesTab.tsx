import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "./ui/button";

export function TemplatesTab() {
  const templates = useQuery(api.messageTemplates.list) || [];
  const createTemplate = useMutation(api.messageTemplates.create);
  const updateTemplate = useMutation(api.messageTemplates.update);
  const removeTemplate = useMutation(api.messageTemplates.remove);

  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Id<"messageTemplates"> | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    content: "",
    category: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await updateTemplate({
          id: editingTemplate,
          ...formData,
          category: formData.category || undefined,
        });
        toast.success("Template updated successfully");
      } else {
        await createTemplate({
          ...formData,
          category: formData.category || undefined,
        });
        toast.success("Template created successfully");
      }
      resetForm();
    } catch (error) {
      toast.error("Failed to save template");
    }
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template._id);
    setFormData({
      name: template.name,
      content: template.content,
      category: template.category || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: Id<"messageTemplates">) => {
    if (confirm("Are you sure you want to delete this template?")) {
      try {
        await removeTemplate({ id });
        toast.success("Template deleted successfully");
      } catch (error) {
        toast.error("Failed to delete template");
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: "", content: "", category: "" });
    setEditingTemplate(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Message Templates</h2>
        <Button onClick={() => setShowForm(true)}>Add Template</Button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">
            {editingTemplate ? "Edit Template" : "Add New Template"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Birthday, Follow-up, Reminder"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message Content *
              </label>
              <textarea
                required
                rows={4}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your message template..."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingTemplate ? "Update" : "Create"}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-lg border shadow-sm text-center text-gray-500">
            No templates yet. Create your first message template to get started.
          </div>
        ) : (
          templates.map((template) => (
            <div key={template._id} className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => handleEdit(template)} className="text-sm">Edit</Button>
                    <Button variant="danger" onClick={() => handleDelete(template._id)} className="text-sm">Delete</Button>
                  </div>
                </div>
              {template.category && (
                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mb-3">
                  {template.category}
                </span>
              )}
              <p className="text-gray-600 text-sm line-clamp-3">{template.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
