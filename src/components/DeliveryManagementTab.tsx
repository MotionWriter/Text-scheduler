import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

export function DeliveryManagementTab() {
  const [timeRange, setTimeRange] = useState(24);
  const [selectedFailedMessage, setSelectedFailedMessage] = useState<Id<"userSelectedMessages"> | null>(null);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [newScheduleTime, setNewScheduleTime] = useState("");

  // Queries
  const systemStats = useQuery(api.deliveryTracking.getSystemDeliveryStats, { timeRangeHours: timeRange });
  const failedMessages = useQuery(api.deliveryTracking.getFailedMessages, { limit: 50 });
  
  // Mutations
  const retryFailedMessage = useMutation(api.deliveryTracking.retryFailedMessage);
  const cancelMessage = useMutation(api.deliveryTracking.cancelMessage);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Trigger refetch by changing a dependency
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRetryMessage = async (messageId: Id<"userSelectedMessages">, customTime?: number) => {
    try {
      await retryFailedMessage({
        messageId,
        newScheduledAt: customTime
      });
      toast.success("Message queued for retry");
      setShowRetryModal(false);
      setSelectedFailedMessage(null);
      setNewScheduleTime("");
    } catch (error) {
      toast.error("Failed to retry message");
    }
  };

  const handleCancelMessage = async (messageId: Id<"userSelectedMessages">) => {
    if (!confirm("Are you sure you want to cancel this message? This action cannot be undone.")) {
      return;
    }

    try {
      await cancelMessage({ 
        messageId, 
        reason: "Cancelled by admin" 
      });
      toast.success("Message cancelled");
    } catch (error) {
      toast.error("Failed to cancel message");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]",
      sent: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
      failed: "bg-[hsl(var(--error))] text-[hsl(var(--error-foreground))]",
      cancelled: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
      unprocessed: "bg-[hsl(var(--info))] text-[hsl(var(--info-foreground))]",
    } as const;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        statusClasses[(status as keyof typeof statusClasses) || "unprocessed"]
      }`}>
        {status || "unprocessed"}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Message Delivery Management</h2>
          <p className="text-gray-600">Monitor and manage message delivery across all users</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Last Hour</option>
            <option value={6}>Last 6 Hours</option>
            <option value={24}>Last 24 Hours</option>
            <option value={72}>Last 3 Days</option>
            <option value={168}>Last Week</option>
          </select>
        </div>
      </div>

      {/* Statistics Cards */}
      {systemStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Messages</p>
                <p className="text-2xl font-bold text-foreground">{systemStats.total}</p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[hsl(var(--info))]">
                <span className="text-[hsl(var(--info-foreground))] text-sm">📊</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sent Successfully</p>
                <p className="text-2xl font-bold text-[hsl(var(--success-foreground))]">{systemStats.sent}</p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[hsl(var(--success))]">
                <span className="text-[hsl(var(--success-foreground))] text-sm">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-[hsl(var(--error-foreground))]">{systemStats.failed}</p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[hsl(var(--error))]">
                <span className="text-[hsl(var(--error-foreground))] text-sm">❌</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-foreground">{systemStats.successRate}%</p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[hsl(var(--accent))]">
                <span className="text-[hsl(var(--accent-foreground))] text-sm">📈</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Delay</p>
                <p className="text-2xl font-bold text-foreground">{systemStats.avgDeliveryTime}m</p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[hsl(var(--warning))]">
                <span className="text-[hsl(var(--warning-foreground))] text-sm">⏱️</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Failed Messages Section */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Failed Messages</h3>
            <span className="text-sm text-gray-500">
              {failedMessages?.length || 0} messages require attention
            </span>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {failedMessages && failedMessages.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🎉</span>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">All Messages Delivered!</h4>
              <p className="text-sm">No failed messages to review.</p>
            </div>
          ) : (
            failedMessages?.map((message) => (
              <div key={message._id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-medium text-gray-900">{message.userName}</span>
                      <span className="text-gray-500 text-sm">{message.userPhone}</span>
                      {getStatusBadge("failed")}
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><span className="font-medium">Lesson:</span> {message.lessonTitle}</p>
                      <p><span className="font-medium">Message:</span> {message.messageContent}</p>
                      <p><span className="font-medium">Attempts:</span> {message.deliveryAttempts}</p>
                      <p><span className="font-medium">Last Attempt:</span> {
                        message.lastDeliveryAttempt ? formatDate(message.lastDeliveryAttempt) : "Never"
                      }</p>
                      {message.deliveryError && (
                        <p><span className="font-medium text-red-600">Error:</span> {message.deliveryError}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleRetryMessage(message._id)}
                      className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Retry Now
                    </button>
                    <button
                      onClick={() => {
                        setSelectedFailedMessage(message._id);
                        setShowRetryModal(true);
                      }}
                      className="bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      Schedule
                    </button>
                    <button
                      onClick={() => handleCancelMessage(message._id)}
                      className="bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Retry Modal */}
      {showRetryModal && selectedFailedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule Message Retry</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Retry Time
                </label>
                <input
                  type="datetime-local"
                  value={newScheduleTime}
                  onChange={(e) => setNewScheduleTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRetryModal(false);
                  setSelectedFailedMessage(null);
                  setNewScheduleTime("");
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const scheduleTime = newScheduleTime ? new Date(newScheduleTime).getTime() : Date.now();
                  handleRetryMessage(selectedFailedMessage, scheduleTime);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Schedule Retry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}