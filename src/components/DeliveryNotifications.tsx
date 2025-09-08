import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

let lastKnownMessageCount = 0;
let lastCheckTime = Date.now();

export function DeliveryNotifications() {
  // Poll for recent delivery status changes
  const recentDeliveries = useQuery(api.deliveryTracking.getUserDeliveryHistory, {
    limit: 10
  });

  useEffect(() => {
    if (!recentDeliveries) return;

    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);

    // Find recently sent messages (within last 5 minutes)
    const recentlySent = recentDeliveries.filter(message => 
      message.deliveryStatus === "sent" && 
      message.actualDeliveryTime && 
      message.actualDeliveryTime > fiveMinutesAgo &&
      message.actualDeliveryTime > lastCheckTime
    );

    // Find recently failed messages (within last 5 minutes)  
    const recentlyFailed = recentDeliveries.filter(message =>
      message.deliveryStatus === "failed" &&
      message.lastDeliveryAttempt &&
      message.lastDeliveryAttempt > fiveMinutesAgo &&
      message.lastDeliveryAttempt > lastCheckTime
    );

    // Show success notifications
    recentlySent.forEach(message => {
      toast.success(
        `📨 Message delivered!`,
        {
          description: `"${message.messageContent.substring(0, 50)}${
            message.messageContent.length > 50 ? '...' : ''
          }" was successfully sent for ${message.lessonTitle}`,
          duration: 5000
        }
      );
    });

    // Show failure notifications
    recentlyFailed.forEach(message => {
      toast.error(
        `❌ Message delivery failed`,
        {
          description: `Failed to send message for ${message.lessonTitle}. ${
            message.deliveryAttempts && message.deliveryAttempts < 3 
              ? 'We\'ll retry automatically.' 
              : 'Please check your delivery history.'
          }`,
          duration: 8000,
          action: {
            label: 'View Details',
            onClick: () => {
              // This would navigate to delivery history
              console.log('Navigate to delivery history for:', message._id);
            }
          }
        }
      );
    });

    // Update tracking variables
    lastCheckTime = now;
    lastKnownMessageCount = recentDeliveries.length;

  }, [recentDeliveries]);

  // This component doesn't render anything visible
  return null;
}

// Hook to provide delivery status context to other components
export function useDeliveryNotifications() {
  const deliveryStats = useQuery(api.deliveryTracking.getUserDeliveryStats);
  const recentDeliveries = useQuery(api.deliveryTracking.getUserDeliveryHistory, {
    limit: 5
  });

  return {
    stats: deliveryStats,
    recentDeliveries,
    hasRecentFailures: recentDeliveries?.some(msg => 
      msg.deliveryStatus === "failed" && 
      msg.lastDeliveryAttempt && 
      msg.lastDeliveryAttempt > (Date.now() - 24 * 60 * 60 * 1000)
    ) || false
  };
}