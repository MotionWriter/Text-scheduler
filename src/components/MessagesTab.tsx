import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { MessagesDataTable } from "./messages-data-table";
import { createMessageColumns, ScheduledMessage } from "./message-columns";
import { MessageFormDialog, MessageFormData } from "./message-form-dialog";
import { MessagesMobileList } from "./messages-mobile-list";
import { ConfirmDialog } from "./ui/confirm-dialog";

export function MessagesTab() {
  const messages = useQuery(api.allScheduledMessages.listAll) || [];
  const pendingAndFailed = (messages as any[]).filter((m) => m.status !== "sent");
  const sentMessages = (messages as any[]).filter((m) => m.status === "sent");
  const user = useQuery(api.auth.loggedInUser);
  const isAdmin = user?.isAdmin || false;
  const createMessage = useMutation(api.scheduledMessages.create);
  const updateMessage = useMutation(api.scheduledMessages.update);
  const updateCustomMessage = useMutation(api.userCustomMessages.update);
  const createForGroup = useMutation(api.scheduledMessages.createForGroup);
  const removeMessage = useMutation(api.scheduledMessages.remove);
  const removeManyMessages = useMutation(api.scheduledMessages.removeMany);
  const removeUserSelected = useMutation(api.userSelectedMessages.remove);
  const createCustomMessage = useMutation(api.userCustomMessages.create);
  const selectCustomMessage = useMutation(api.userSelectedMessages.selectCustom);
  // Persist study/lesson group preferences so study messages resolve to a group in lists
  const setStudyGroupPref = useMutation(api.studyGroupPrefs.setForStudy);
  const setLessonGroupPref = useMutation(api.lessonGroupPrefs.setForLesson);

  const [showDialog, setShowDialog] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ScheduledMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSent, setShowSent] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; message: ScheduledMessage | null }>({ show: false, message: null });

  const handleEdit = (message: ScheduledMessage) => {
    setEditingMessage(message);
    setShowDialog(true);
  };

  const handleDelete = (message: ScheduledMessage) => {
    if (message.status !== "pending" && message.status !== "failed") {
      toast.error("Only pending or failed messages can be deleted");
      return;
    }

    setConfirmDelete({ show: true, message });
  };

  const confirmDeleteMessage = async () => {
    const message = confirmDelete.message;
    if (!message) return;

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
        // Create custom message and select it for scheduling in the study system
        const customMessageId = await createCustomMessage({
          lessonId: formData.lessonId as Id<"lessons">,
          content: formData.message,
        });

        // If the user chose a group in the dialog, persist it as their preference
        // so production can resolve the group for study messages.
        if (formData.groupId) {
          try {
            if (formData.studyBookId) {
              await setStudyGroupPref({
                studyBookId: formData.studyBookId as Id<"studyBooks">,
                groupId: formData.groupId as Id<"groups">,
              });
            }
            // Also set a lesson-level preference to be explicit for this lesson
            await setLessonGroupPref({
              lessonId: formData.lessonId as Id<"lessons">,
              groupId: formData.groupId as Id<"groups">,
            });
          } catch (e) {
            // Non-blocking: continue scheduling even if preference write fails
            console.error("Failed to persist study/lesson group preference", e);
          }
        }
        
        // Then create a user selection for this custom message with scheduling
        await selectCustomMessage({
          customMessageId,
          scheduledAt: new Date(formData.scheduledFor).getTime(),
        });
        
        toast.success("Custom study message created and scheduled");
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
      if (row.source === "study" && row.messageSource === "custom" && row.customMessageId) {
        // For custom study messages, update the userCustomMessages content
        if (patch.message !== undefined) {
          await updateCustomMessage({
            id: row.customMessageId,
            content: patch.message
          })
          toast.success("Custom study message updated")
        }
        // Note: For scheduling changes on study messages, we'd need to update userSelectedMessages
        // but that's more complex and not implemented yet
      } else {
        // For manual messages, support aggregated and single updates
        if (row.aggregated && Array.isArray(row.messageIds) && row.messageIds.length > 0) {
          await Promise.all(
            (row.messageIds as any[]).map((id) =>
              updateMessage({
                id: id as Id<"scheduledMessages">,
                message: (patch.message ?? row.message),
                scheduledFor: (patch.scheduledFor ?? row.scheduledFor),
                notes: (patch.notes ?? row.notes),
              })
            )
          )
        } else {
          await updateMessage({
            id: row._id as Id<"scheduledMessages">,
            message: patch.message ?? row.message,
            scheduledFor: patch.scheduledFor ?? row.scheduledFor,
            notes: patch.notes ?? row.notes,
          })
        }
        toast.success("Scheduled message updated")
      }
    } catch (error) {
      toast.error("Failed to update scheduled message")
      throw error
    }
  }

  const columnsActive = createMessageColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
    onDuplicate: handleDuplicate,
    onUpdate: handleInlineUpdate,
    isAdmin,
    showActions: true,
  });

  const columnsSent = createMessageColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
    onDuplicate: handleDuplicate,
    onUpdate: handleInlineUpdate,
    isAdmin,
    showActions: false,
  });
  return (
    <div className="space-y-6">
      {/* Desktop table */}
      <div className="hidden md:block space-y-4">
        <MessagesDataTable
          columns={columnsActive}
          data={pendingAndFailed}
          onNewMessage={handleNewMessage}
        />

        {sentMessages.length > 0 && (
          <div className="rounded-xl border bg-muted/30">
            <button
              onClick={() => setShowSent((s) => !s)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/60"
              aria-expanded={showSent}
            >
              <span>Sent Messages ({sentMessages.length})</span>
              <span className="text-muted-foreground">{showSent ? "Hide" : "Show"}</span>
            </button>
            {showSent && (
              <div className="p-2">
                <MessagesDataTable
                  columns={columnsSent}
                  data={sentMessages}
                  onNewMessage={handleNewMessage}
                  hideHeader
                  hideControls
                />
              </div>
            )}
          </div>
        )}
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
          data={pendingAndFailed as ScheduledMessage[]}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />

        {sentMessages.length > 0 && (
          <div className="rounded-xl border bg-muted/30">
            <button
              onClick={() => setShowSent((s) => !s)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/60"
              aria-expanded={showSent}
            >
              <span>Sent Messages ({sentMessages.length})</span>
              <span className="text-muted-foreground">{showSent ? "Hide" : "Show"}</span>
            </button>
            {showSent && (
              <div className="p-3">
                <MessagesMobileList
                  data={sentMessages as ScheduledMessage[]}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                />
              </div>
            )}
          </div>
        )}
      </div>
      
      <MessageFormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        message={editingMessage}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      <ConfirmDialog
        open={confirmDelete.show}
        onOpenChange={(open) => setConfirmDelete({ show: open, message: null })}
        title="Delete Scheduled Message"
        description={
          confirmDelete.message?.aggregated && Array.isArray(confirmDelete.message.messageIds)
            ? `Delete this grouped scheduled message for ${confirmDelete.message.messageIds.length} recipients?`
            : "Are you sure you want to delete this scheduled message?"
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmDeleteMessage}
      />
    </div>
  );
}
