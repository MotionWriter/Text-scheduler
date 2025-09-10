import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { MessagesDataTable } from "./messages-data-table";
import { createMessageColumns, ScheduledMessage } from "./message-columns";
import { MessageFormDialog, MessageFormData } from "./message-form-dialog";
import { MessagesMobileList } from "./messages-mobile-list";

export function MessagesTab() {
  const messages = useQuery(api.allScheduledMessages.listAll) || [];
  const user = useQuery(api.auth.loggedInUser);
  const isAdmin = user?.isAdmin || false;
  const createMessage = useMutation(api.scheduledMessages.create);
  const updateMessage = useMutation(api.scheduledMessages.update);
  const createForGroup = useMutation(api.scheduledMessages.createForGroup);
  const removeMessage = useMutation(api.scheduledMessages.remove);
  const removeManyMessages = useMutation(api.scheduledMessages.removeMany);
  const removeUserSelected = useMutation(api.userSelectedMessages.remove);
  const createCustomMessage = useMutation(api.userCustomMessages.create);

  const [showDialog, setShowDialog] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ScheduledMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEdit = (message: ScheduledMessage) => {
    setEditingMessage(message);
    setShowDialog(true);
  };

  const handleDelete = async (message: ScheduledMessage) => {
    if (message.status !== "pending" && message.status !== "failed") {
      toast.error("Only pending or failed messages can be deleted");
      return;
    }

    const count = message.aggregated && Array.isArray(message.messageIds)
      ? message.messageIds.length
      : 1;

    const ok = confirm(
      count > 1
        ? `Delete this grouped scheduled message for ${count} recipients?`
        : "Are you sure you want to delete this scheduled message?"
    );
    if (!ok) return;

    try {
      if (message.source === "manual") {
        if (message.aggregated && Array.isArray(message.messageIds) && message.messageIds.length > 0) {
          // Bulk delete all underlying scheduledMessages
          await removeManyMessages({
            ids: message.messageIds as unknown as Id<"scheduledMessages">[],
          });
        } else {
          await removeMessage({ id: message._id as Id<"scheduledMessages"> });
        }
      } else if (message.source === "study") {
        // For study messages, we use the userSelectedMessages remove mutation
        await removeUserSelected({ id: message._id as Id<"userSelectedMessages"> });
      }
      toast.success("Scheduled message deleted successfully");
    } catch (error) {
      toast.error("Failed to delete scheduled message");
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
        });
        toast.success("Message updated successfully");
      } else if (formData.messageType === "custom") {
        // Schedule custom study message for delivery context
        // For now, both Individual (per-member) and Group modes schedule per-member messages
        await createForGroup({
          groupId: formData.groupId as Id<"groups">,
          message: formData.message,
          scheduledFor: new Date(formData.scheduledFor).getTime(),
          notes: formData.notes || undefined,
        });
        toast.success("Scheduled message to group");
      } else if (formData.messageType === "group") {
        // Legacy fallback path
        await createForGroup({
          groupId: formData.groupId as Id<"groups">,
          message: formData.message,
          scheduledFor: new Date(formData.scheduledFor).getTime(),
          notes: formData.notes || undefined,
        });
        toast.success("Messages scheduled for all group members");
      } else {
        await createMessage({
          contactId: formData.contactId as Id<"contacts">,
          message: formData.message,
          scheduledFor: new Date(formData.scheduledFor).getTime(),
          notes: formData.notes || undefined,
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

  const handleInlineUpdate = async (
    row: ScheduledMessage,
    patch: Partial<Pick<ScheduledMessage, "message" | "scheduledFor" | "notes">>
  ) => {
    try {
      await updateMessage({
        id: row._id,
        message: patch.message ?? row.message,
        scheduledFor: patch.scheduledFor ?? row.scheduledFor,
        notes: patch.notes ?? row.notes,
      })
      toast.success("Scheduled message updated")
    } catch (error) {
      toast.error("Failed to update scheduled message")
      throw error
    }
  }

  const columns = createMessageColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
    onDuplicate: handleDuplicate,
    onUpdate: handleInlineUpdate,
    isAdmin,
  });

  return (
    <div className="space-y-6">
      {/* Desktop table */}
      <div className="hidden md:block">
        <MessagesDataTable
          columns={columns}
          data={messages}
          onNewMessage={handleNewMessage}
        />
      </div>

      {/* Mobile header + list */}
      <div className="block md:hidden space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Scheduled Messages</h2>
          </div>
          <button onClick={handleNewMessage} className="btn">
            Schedule
          </button>
        </div>
        <MessagesMobileList
          data={messages as ScheduledMessage[]}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      </div>
      
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
