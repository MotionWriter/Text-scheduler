import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface MessageSelectorProps {
  lessonId: Id<"lessons">;
  lessonTitle: string;
  onBack: () => void;
}

export function MessageSelector({ lessonId, lessonTitle, onBack }: MessageSelectorProps) {
  const [activeTab, setActiveTab] = useState<"predefined" | "custom" | "selected">("predefined");
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customMessageContent, setCustomMessageContent] = useState("");
  const [editingCustomMessage, setEditingCustomMessage] = useState<Id<"userCustomMessages"> | null>(null);

  // Queries
  const predefinedMessages = useQuery(api.predefinedMessages.listByLesson, { lessonId }) || [];
  const userCustomMessages = useQuery(api.userCustomMessages.getForLesson, { lessonId }) || [];
  const customMessageCount = useQuery(api.userCustomMessages.getCountForLesson, { lessonId }) || 0;
  const selectedMessages = useQuery(api.userSelectedMessages.getForLesson, { lessonId }) || [];

  // Mutations
  const createCustomMessage = useMutation(api.userCustomMessages.create);
  const updateCustomMessage = useMutation(api.userCustomMessages.update);
  const removeCustomMessage = useMutation(api.userCustomMessages.remove);
  const selectPredefinedMessage = useMutation(api.userSelectedMessages.selectPredefined);
  const selectCustomMessage = useMutation(api.userSelectedMessages.selectCustom);
  const removeSelectedMessage = useMutation(api.userSelectedMessages.remove);
  const updateScheduling = useMutation(api.userSelectedMessages.updateScheduling);

  const canCreateCustomMessage = customMessageCount < 2;
  const characterCount = customMessageContent.length;
  const isValidCustomMessage = characterCount > 0 && characterCount <= 280;

  const resetCustomForm = () => {
    setCustomMessageContent("");
    setEditingCustomMessage(null);
    setShowCustomForm(false);
  };

  const handleCreateCustomMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidCustomMessage) return;

    try {
      if (editingCustomMessage) {
        await updateCustomMessage({
          id: editingCustomMessage,
          content: customMessageContent.trim()
        });
        toast.success("Custom message updated successfully");
      } else {
        await createCustomMessage({
          lessonId,
          content: customMessageContent.trim()
        });
        toast.success("Custom message created successfully");
      }
      resetCustomForm();
    } catch (error) {
      toast.error("Failed to save custom message");
    }
  };

  const handleEditCustomMessage = (message: any) => {
    setEditingCustomMessage(message._id);
    setCustomMessageContent(message.content);
    setShowCustomForm(true);
  };

  const handleDeleteCustomMessage = async (id: Id<"userCustomMessages">) => {
    if (confirm("Are you sure you want to delete this custom message?")) {
      try {
        await removeCustomMessage({ id });
        toast.success("Custom message deleted successfully");
      } catch (error) {
        toast.error("Failed to delete custom message");
      }
    }
  };

  const handleSelectPredefinedMessage = async (predefinedMessageId: Id<"predefinedMessages">) => {
    try {
      await selectPredefinedMessage({ predefinedMessageId });
      toast.success("Message selected successfully");
      setActiveTab("selected");
    } catch (error) {
      toast.error("Failed to select message");
    }
  };

  const handleSelectCustomMessage = async (customMessageId: Id<"userCustomMessages">) => {
    try {
      await selectCustomMessage({ customMessageId });
      toast.success("Custom message selected successfully");
      setActiveTab("selected");
    } catch (error) {
      toast.error("Failed to select custom message");
    }
  };

  const handleRemoveSelectedMessage = async (id: Id<"userSelectedMessages">) => {
    try {
      await removeSelectedMessage({ id });
      toast.success("Message removed from selection");
    } catch (error) {
      toast.error("Failed to remove message");
    }
  };

  const handleScheduleMessage = async (id: Id<"userSelectedMessages">, isScheduled: boolean, scheduledAt?: number) => {
    try {
      await updateScheduling({ id, isScheduled, scheduledAt });
      toast.success(isScheduled ? "Message scheduled successfully" : "Message unscheduled successfully");
    } catch (error) {
      toast.error("Failed to update message scheduling");
    }
  };

  const getMessageTypeIcon = (messageType: string) => {
    switch (messageType) {
      case 'reminder': return '⏰';
      case 'scripture': return '📖';
      case 'encouragement': return '💪';
      case 'reflection': return '🤔';
      default: return '💬';
    }
  };

  const isMessageSelected = (messageId: Id<"predefinedMessages"> | Id<"userCustomMessages">, messageType: 'predefined' | 'custom') => {
    return selectedMessages.some(selected => 
      messageType === 'predefined' 
        ? selected.predefinedMessageId === messageId
        : selected.customMessageId === messageId
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{lessonTitle} - Messages</h3>
          <p className="text-gray-600 text-sm">Select predefined messages or create your own</p>
        </div>
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
        >
          ← Back to Lessons
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("predefined")}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "predefined"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            📋 Predefined Messages ({predefinedMessages.length})
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "custom"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            ✏️ Custom Messages ({customMessageCount}/2)
          </button>
          <button
            onClick={() => setActiveTab("selected")}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "selected"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            ✅ Selected Messages ({selectedMessages.length})
          </button>
        </nav>
      </div>

      {/* Predefined Messages Tab */}
      {activeTab === "predefined" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {predefinedMessages.length === 0 ? (
              <div className="bg-white p-8 rounded-lg border shadow-sm text-center text-gray-500">
                No predefined messages available for this lesson.
              </div>
            ) : (
              predefinedMessages.map((message) => {
                const isSelected = isMessageSelected(message._id, 'predefined');
                return (
                  <div key={message._id} className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="text-lg mr-2">{getMessageTypeIcon(message.messageType)}</span>
                          <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full capitalize">
                            {message.messageType}
                          </span>
                          {isSelected && (
                            <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full ml-2">
                              ✓ Selected
                            </span>
                          )}
                        </div>
                        <p className="text-gray-900 text-sm">{message.content}</p>
                      </div>
                      <button
                        onClick={() => handleSelectPredefinedMessage(message._id)}
                        disabled={isSelected}
                        className={`ml-4 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          isSelected
                            ? "bg-green-100 text-green-700 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Custom Messages Tab */}
      {activeTab === "custom" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-lg font-medium text-gray-900">Your Custom Messages</h4>
              <p className="text-sm text-gray-600">Create up to 2 personalized messages for this lesson</p>
            </div>
            {canCreateCustomMessage && (
              <button
                onClick={() => setShowCustomForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                + Add Custom Message
              </button>
            )}
          </div>

          {!canCreateCustomMessage && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-amber-600 text-lg mr-2">⚠️</span>
                <p className="text-sm text-amber-700">
                  You've reached the limit of 2 custom messages per lesson. Delete an existing message to create a new one.
                </p>
              </div>
            </div>
          )}

          {showCustomForm && (
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h5 className="text-lg font-semibold mb-4">
                {editingCustomMessage ? "Edit Custom Message" : "Create Custom Message"}
              </h5>
              <form onSubmit={handleCreateCustomMessage} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message Content *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={customMessageContent}
                    onChange={(e) => setCustomMessageContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Write your personal message for this lesson..."
                    maxLength={280}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <span className={`text-xs ${characterCount > 280 ? 'text-red-600' : 'text-gray-500'}`}>
                      {characterCount}/280 characters
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!isValidCustomMessage}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {editingCustomMessage ? "Update" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={resetCustomForm}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-3">
            {userCustomMessages.length === 0 ? (
              <div className="bg-white p-8 rounded-lg border shadow-sm text-center text-gray-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">✏️</span>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Custom Messages Yet</h4>
                <p className="text-sm">Create personalized messages that resonate with your study journey.</p>
              </div>
            ) : (
              userCustomMessages.map((message) => {
                const isSelected = isMessageSelected(message._id, 'custom');
                return (
                  <div key={message._id} className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                            Custom Message
                          </span>
                          {isSelected && (
                            <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full ml-2">
                              ✓ Selected
                            </span>
                          )}
                        </div>
                        <p className="text-gray-900 text-sm">{message.content}</p>
                        <p className="text-gray-500 text-xs mt-2">{message.content.length}/280 characters</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleSelectCustomMessage(message._id)}
                          disabled={isSelected}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            isSelected
                              ? "bg-green-100 text-green-700 cursor-not-allowed"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {isSelected ? "Selected" : "Select"}
                        </button>
                        <button
                          onClick={() => handleEditCustomMessage(message)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCustomMessage(message._id)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Selected Messages Tab */}
      {activeTab === "selected" && (
        <div className="space-y-4">
          <div>
            <h4 className="text-lg font-medium text-gray-900">Your Selected Messages</h4>
            <p className="text-sm text-gray-600">Manage your selected messages and schedule them</p>
          </div>

          <div className="space-y-3">
            {selectedMessages.length === 0 ? (
              <div className="bg-white p-8 rounded-lg border shadow-sm text-center text-gray-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Messages Selected</h4>
                <p className="text-sm">Select predefined messages or create custom ones to get started.</p>
              </div>
            ) : (
              selectedMessages.map((selected) => {
                const message = selected.predefinedMessageId 
                  ? predefinedMessages.find(m => m._id === selected.predefinedMessageId)
                  : userCustomMessages.find(m => m._id === selected.customMessageId);
                
                if (!message) return null;

                return (
                  <div key={selected._id} className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          {selected.predefinedMessageId ? (
                            <>
                              <span className="text-lg mr-2">{getMessageTypeIcon((message as any).messageType)}</span>
                              <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full capitalize">
                                {(message as any).messageType}
                              </span>
                            </>
                          ) : (
                            <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                              Custom Message
                            </span>
                          )}
                          {selected.isScheduled && (
                            <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full ml-2">
                              📅 Scheduled
                            </span>
                          )}
                        </div>
                        <p className="text-gray-900 text-sm">{message.content}</p>
                        {selected.scheduledAt && (
                          <div className="mt-2 space-y-1">
                            <p className="text-gray-500 text-xs">
                              Scheduled for: {new Date(selected.scheduledAt).toLocaleString()}
                            </p>
                            {selected.deliveryStatus && (
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  selected.deliveryStatus === "sent" 
                                    ? "bg-green-100 text-green-800"
                                    : selected.deliveryStatus === "failed"
                                    ? "bg-red-100 text-red-800"
                                    : selected.deliveryStatus === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}>
                                  {selected.deliveryStatus === "sent" && "✅ Sent"}
                                  {selected.deliveryStatus === "failed" && "❌ Failed"}
                                  {selected.deliveryStatus === "pending" && "⏳ Pending"}
                                  {selected.deliveryStatus === "cancelled" && "🚫 Cancelled"}
                                </span>
                                {selected.actualDeliveryTime && selected.deliveryStatus === "sent" && (
                                  <span className="text-xs text-gray-500">
                                    Delivered: {new Date(selected.actualDeliveryTime).toLocaleString()}
                                  </span>
                                )}
                                {selected.deliveryError && selected.deliveryStatus === "failed" && (
                                  <span className="text-xs text-red-600" title={selected.deliveryError}>
                                    Error: {selected.deliveryError.substring(0, 30)}...
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleScheduleMessage(selected._id, !selected.isScheduled, selected.scheduledAt || Date.now())}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            selected.isScheduled
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {selected.isScheduled ? "Unschedule" : "Schedule"}
                        </button>
                        <button
                          onClick={() => handleRemoveSelectedMessage(selected._id)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}