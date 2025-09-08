import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface DeliveryHistoryViewProps {
  onBack: () => void;
}

export function DeliveryHistoryView({ onBack }: DeliveryHistoryViewProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "sent" | "failed" | "cancelled">("all");
  const [selectedMessage, setSelectedMessage] = useState<Id<"userSelectedMessages"> | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newScheduleTime, setNewScheduleTime] = useState("");

  // Queries
  const deliveryHistory = useQuery(api.deliveryTracking.getUserDeliveryHistory, {
    limit: 100,
    status: statusFilter === "all" ? undefined : statusFilter
  });
  
  const deliveryStats = useQuery(api.deliveryTracking.getUserDeliveryStats);

  // Mutations
  const rescheduleMessage = useMutation(api.deliveryTracking.rescheduleMessage);

  const handleRescheduleMessage = async () => {
    if (!selectedMessage || !newScheduleTime) return;

    try {
      const scheduleTime = new Date(newScheduleTime).getTime();
      await rescheduleMessage({
        messageId: selectedMessage,
        newScheduledAt: scheduleTime
      });
      toast.success("Message rescheduled successfully");
      setShowRescheduleModal(false);
      setSelectedMessage(null);
      setNewScheduleTime("");
    } catch (error) {
      toast.error("Failed to reschedule message");
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: "bg-yellow-100 text-yellow-800",
      sent: "bg-green-100 text-green-800", 
      failed: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
      unprocessed: "bg-blue-100 text-blue-800"
    };

    const statusIcons = {
      pending: "⏳",
      sent: "✅",
      failed: "❌", 
      cancelled: "🚫",
      unprocessed: "📋"
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        statusClasses[status as keyof typeof statusClasses] || statusClasses.unprocessed
      }`}>
        <span className="mr-1">{statusIcons[status as keyof typeof statusIcons] || statusIcons.unprocessed}</span>
        {status || "unprocessed"}
      </span>
    );
  };

  const getMessageTypeIcon = (messageType: string) => {
    switch (messageType) {
      case 'reminder': return '⏰';
      case 'scripture': return '📖';
      case 'encouragement': return '💪';
      case 'reflection': return '🤔';
      case 'custom': return '✏️';
      default: return '💬';
    }
  };

  const canReschedule = (message: any) => {
    return message.deliveryStatus === "failed" || message.deliveryStatus === "unprocessed" || !message.deliveryStatus;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Message Delivery History</h2>
          <p className="text-gray-600">Track the status of your scheduled messages</p>
        </div>
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
        >
          ← Back
        </button>
      </div>

      {/* Statistics Cards */}
      {deliveryStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Messages</p>
                <p className="text-2xl font-bold text-gray-900">{deliveryStats.total}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm">📊</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Delivered</p>
                <p className="text-2xl font-bold text-green-600">{deliveryStats.sent}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{deliveryStats.successRate}%</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 text-sm">📈</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Delay</p>
                <p className="text-2xl font-bold text-gray-900">{deliveryStats.avgDeliveryTime}m</p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 text-sm">⏱️</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filter by status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Messages</option>
            <option value="unprocessed">Unprocessed</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Delivery History */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Message History</h3>
        </div>

        <div className="divide-y divide-gray-200">
          {deliveryHistory && deliveryHistory.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📨</span>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Messages Found</h4>
              <p className="text-sm">
                {statusFilter === "all" 
                  ? "You haven't scheduled any messages yet."
                  : `No messages with ${statusFilter} status found.`
                }
              </p>
            </div>
          ) : (
            deliveryHistory?.map((message) => (
              <div key={message._id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-lg">{getMessageTypeIcon(message.messageType)}</span>
                      <span className="font-medium text-gray-900">{message.lessonTitle}</span>
                      {getStatusBadge(message.deliveryStatus)}
                    </div>

                    <div className="mb-3">
                      <p className="text-gray-900 text-sm">{message.messageContent}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-500">
                      <div>
                        <span className="font-medium">Scheduled:</span><br/>
                        {formatDate(message.scheduledAt)}
                      </div>
                      
                      {message.actualDeliveryTime && (
                        <div>
                          <span className="font-medium">Delivered:</span><br/>
                          {formatDate(message.actualDeliveryTime)}
                        </div>
                      )}
                      
                      {message.deliveryAttempts && (
                        <div>
                          <span className="font-medium">Attempts:</span><br/>
                          {message.deliveryAttempts}
                        </div>
                      )}
                    </div>

                    {message.deliveryError && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                        <span className="text-xs font-medium text-red-800">Error:</span>
                        <p className="text-xs text-red-700 mt-1">{message.deliveryError}</p>
                      </div>
                    )}
                  </div>

                  {canReschedule(message) && (
                    <div className="ml-4">
                      <button
                        onClick={() => {
                          setSelectedMessage(message._id);
                          setShowRescheduleModal(true);
                        }}
                        className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        Reschedule
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reschedule Message</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Delivery Time
                </label>
                <input
                  type="datetime-local"
                  value={newScheduleTime}
                  onChange={(e) => setNewScheduleTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Choose when you want this message to be delivered
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRescheduleModal(false);
                  setSelectedMessage(null);
                  setNewScheduleTime("");
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRescheduleMessage}
                disabled={!newScheduleTime}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Reschedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}