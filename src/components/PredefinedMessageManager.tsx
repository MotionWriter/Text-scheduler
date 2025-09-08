import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

const MESSAGE_TYPES = [
  "reminder",
  "scripture", 
  "discussion",
  "encouragement",
  "prayer",
  "application",
  "general",
] as const;

interface PredefinedMessageManagerProps {
  lessonId: Id<"lessons">;
  onBack: () => void;
}

export function PredefinedMessageManager({ lessonId, onBack }: PredefinedMessageManagerProps) {
  const messages = useQuery(api.predefinedMessages.listByLesson, { lessonId }) || [];
  const createMessage = useMutation(api.predefinedMessages.create);
  const updateMessage = useMutation(api.predefinedMessages.update);
  const removeMessage = useMutation(api.predefinedMessages.remove);

  const [showForm, setShowForm] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Id<"predefinedMessages"> | null>(null);
  const [formData, setFormData] = useState({
    content: "",
    messageType: "general" as typeof MESSAGE_TYPES[number],
  });

  // Preserve existing pattern from TemplatesTab
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMessage) {
        await updateMessage({
          id: editingMessage,
          ...formData,
        });
        toast.success("Message updated successfully");
      } else {
        await createMessage({
          lessonId,
          ...formData,
        });
        toast.success("Message created successfully");
      }
      resetForm();
    } catch (error) {
      toast.error("Failed to save message");
    }
  };

  const resetForm = () => {
    setFormData({ content: "", messageType: "general" });
    setEditingMessage(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Back button and header - matches TemplatesTab pattern */}
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-900 mb-2"
          >
            ← Back to Lessons
          </button>
          <h3 className="text-xl font-semibold">Predefined Messages</h3>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Message
        </button>
      </div>

      {/* Message Form - Same pattern as TemplatesTab */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h4 className="text-lg font-semibold mb-4">
            {editingMessage ? "Edit Message" : "Add New Message"}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message Type
              </label>
              <select
                value={formData.messageType}
                onChange={(e) => setFormData({ ...formData, messageType: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MESSAGE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
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
                placeholder="Enter your predefined message content... (no character limit)"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingMessage ? "Update" : "Create"}
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

      {/* Messages Grid - Same pattern as TemplatesTab cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {messages.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-lg border shadow-sm text-center text-gray-500">
            No predefined messages yet. Create your first message to get started.
          </div>
        ) : (
          messages.map((message) => (
            <div key={message._id} className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {message.messageType}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingMessage(message._id);
                      setFormData({
                        content: message.content,
                        messageType: message.messageType,
                      });
                      setShowForm(true);
                    }}
                    className="text-blue-600 hover:text-blue-900 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm("Are you sure you want to delete this message?")) {
                        try {
                          await removeMessage({ id: message._id });
                          toast.success("Message deleted successfully");
                        } catch (error) {
                          toast.error("Failed to delete message");
                        }
                      }
                    }}
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-gray-600 text-sm line-clamp-4">{message.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}