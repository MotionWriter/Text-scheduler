import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { MessagesDataTable } from "./messages-data-table";
import { createMessageColumns, ScheduledMessage } from "./message-columns";
import { MessageFormDialog, MessageFormData } from "./message-form-dialog";

export function MessagesTab() {
  const messages = useQuery(api.scheduledMessages.list) || [];
  const createMessage = useMutation(api.scheduledMessages.create);
  const updateMessage = useMutation(api.scheduledMessages.update);
  const createForGroup = useMutation(api.scheduledMessages.createForGroup);
  const removeMessage = useMutation(api.scheduledMessages.remove);

  const [showDialog, setShowDialog] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ScheduledMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEdit = (message: ScheduledMessage) => {
    setEditingMessage(message);
    setShowDialog(true);
  };

  const handleDelete = async (id: Id<"scheduledMessages">) => {
    if (confirm("Are you sure you want to delete this scheduled message?")) {
      try {
        await removeMessage({ id });
        toast.success("Scheduled message deleted successfully");
      } catch (error) {
        toast.error("Failed to delete scheduled message");
      }
    }
  };

  const handleDuplicate = (message: ScheduledMessage) => {
    // Create a copy without the ID and reset scheduling time
    setEditingMessage(null);
    setShowDialog(true);
    // The form will handle the duplication logic
  };

  const handleNewMessage = () => {
    setEditingMessage(null);
    setShowDialog(true);
  };

  const handleFormSubmit = async (formData: MessageFormData) => {
    setIsSubmitting(true);
    try {
      if (editingMessage) {
        // Update existing message
        await updateMessage({
          id: editingMessage._id,
          message: formData.message,
          scheduledFor: new Date(formData.scheduledFor).getTime(),
          notes: formData.notes || undefined,
          category: formData.category && formData.category !== "none" ? formData.category : undefined,
          templateId: formData.templateId && formData.templateId !== "none" ? (formData.templateId as Id<"messageTemplates">) : undefined,
        });
        toast.success("Message updated successfully");
      } else if (formData.messageType === "group") {
        await createForGroup({
          groupId: formData.groupId as Id<"groups">,
          templateId: formData.templateId && formData.templateId !== "none" ? (formData.templateId as Id<"messageTemplates">) : undefined,
          message: formData.message,
          scheduledFor: new Date(formData.scheduledFor).getTime(),
          notes: formData.notes || undefined,
          category: formData.category && formData.category !== "none" ? formData.category : undefined,
        });
        toast.success("Messages scheduled for all group members");
      } else {
        await createMessage({
          contactId: formData.contactId as Id<"contacts">,
          templateId: formData.templateId && formData.templateId !== "none" ? (formData.templateId as Id<"messageTemplates">) : undefined,
          message: formData.message,
          scheduledFor: new Date(formData.scheduledFor).getTime(),
          notes: formData.notes || undefined,
          category: formData.category && formData.category !== "none" ? formData.category : undefined,
        });
        toast.success("Message scheduled successfully");
      }
      setShowDialog(false);
      setEditingMessage(null);
    } catch (error) {
      toast.error(editingMessage ? "Failed to update message" : "Failed to schedule message");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = createMessageColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
    onDuplicate: handleDuplicate,
  });

  return (
    <div className="space-y-6">
      <MessagesDataTable
        columns={columns}
        data={messages}
        onNewMessage={handleNewMessage}
      />
      
      <MessageFormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        message={editingMessage}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
