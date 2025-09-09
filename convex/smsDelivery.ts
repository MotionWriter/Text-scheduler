import { internalMutation, internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// Internal action to send a scheduled message via SMS
export const sendScheduledMessage = internalAction({
  args: {
    messageId: v.id("userSelectedMessages")
  },
  handler: async (ctx, args) => {
    try {
      // Get the message details
      const messageDetails = await ctx.runQuery(internal.smsDelivery.getMessageForDelivery, {
        messageId: args.messageId
      });

      if (!messageDetails) {
        throw new Error("Message not found");
      }

      console.log(`[SMSDelivery] Sending message ${args.messageId} to user ${messageDetails.userId}`);

      // Get user's phone number
      const user = await ctx.runQuery(internal.smsDelivery.getUserPhone, {
        userId: messageDetails.userId
      });

      if (!user?.phone) {
        throw new Error("User phone number not found");
      }

      // Validate and format phone number
      const formattedPhone = validateAndFormatPhone(user.phone);
      if (!formattedPhone) {
        throw new Error("Invalid phone number format");
      }

      // Send the SMS
      const smsResult = await sendSMS({
        to: formattedPhone,
        message: messageDetails.content,
        userId: messageDetails.userId
      });

      if (smsResult.success) {
        // Mark as successfully sent
        await ctx.runMutation(internal.smsDelivery.markMessageSent, {
          messageId: args.messageId,
          deliveryTime: Date.now(),
          externalId: smsResult.messageId
        });

        console.log(`[SMSDelivery] Successfully sent message ${args.messageId}`);
      } else {
        throw new Error(smsResult.error || "SMS delivery failed");
      }

    } catch (error) {
      console.error(`[SMSDelivery] Failed to send message ${args.messageId}:`, error);
      
      // Mark as failed
      await ctx.runMutation(internal.smsDelivery.markMessageFailed, {
        messageId: args.messageId,
        error: String(error)
      });
    }
  }
});

// Internal query to get message content for delivery
export const getMessageForDelivery = internalQuery({
  args: { messageId: v.id("userSelectedMessages") },
  handler: async (ctx, args) => {
    const selectedMessage = await ctx.db.get(args.messageId);
    if (!selectedMessage) {
      return null;
    }

    let messageContent = "";
    
    // Get the actual message content
    if (selectedMessage.predefinedMessageId) {
      const predefinedMessage = await ctx.db.get(selectedMessage.predefinedMessageId);
      messageContent = predefinedMessage?.content || "";
    } else if (selectedMessage.customMessageId) {
      const customMessage = await ctx.db.get(selectedMessage.customMessageId);
      messageContent = customMessage?.content || "";
    }

    // Get lesson title for context
    const lesson = await ctx.db.get(selectedMessage.lessonId);
    const lessonTitle = lesson?.title || "";

    return {
      userId: selectedMessage.userId,
      content: messageContent,
      lessonTitle,
      scheduledAt: selectedMessage.scheduledAt
    };
  }
});

// Internal query to get user's phone number
export const getUserPhone = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return {
      phone: user?.phone,
      name: user?.name,
      email: user?.email
    };
  }
});

// Internal mutation to mark message as sent
export const markMessageSent = internalMutation({
  args: {
    messageId: v.id("userSelectedMessages"),
    deliveryTime: v.number(),
    externalId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      deliveryStatus: "sent",
      actualDeliveryTime: args.deliveryTime,
      deliveryError: undefined
    });
  }
});

// Internal mutation to mark message as failed
export const markMessageFailed = internalMutation({
  args: {
    messageId: v.id("userSelectedMessages"),
    error: v.string()
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      deliveryStatus: "failed",
      deliveryError: args.error
    });
  }
});

// Function to validate and format phone number
function validateAndFormatPhone(phone: string): string | null {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's a valid US phone number (10 digits) or international (11+ digits)
  if (cleaned.length === 10) {
    // US number, add country code
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // US number with country code
    return `+${cleaned}`;
  } else if (cleaned.length >= 10) {
    // International number
    return `+${cleaned}`;
  }
  
  return null; // Invalid format
}

// SMS sending function - placeholder for actual SMS service integration
async function sendSMS({ to, message, userId }: { 
  to: string; 
  message: string; 
  userId: Id<"users"> 
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  
  // For development/testing, we'll simulate SMS sending
  // In production, this would integrate with Twilio, AWS SNS, etc.
  
  console.log(`[SMSDelivery] Simulating SMS to ${to}: ${message.substring(0, 50)}...`);
  
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.1) { // 10% failure rate for testing
      throw new Error("Simulated SMS service error");
    }
    
    // Simulate success
    const messageId = `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    return {
      success: true,
      messageId
    };
    
  } catch (error) {
    return {
      success: false,
      error: String(error)
    };
  }
  
  /*
  // Real Twilio integration example:
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("Twilio credentials not configured");
  }
  
  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: to,
        Body: message,
      }),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      return {
        success: true,
        messageId: result.sid
      };
    } else {
      return {
        success: false,
        error: result.message || 'SMS sending failed'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: String(error)
    };
  }
  */
}

// Internal query to get pending study messages for API consumption
export const getPendingStudyMessages = internalQuery({
  args: {
    userId: v.id("users"),
    currentTime: v.number(),
    limit: v.optional(v.number()),
    startOfDay: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("userSelectedMessages")
      .withIndex("by_scheduled_time")
      .filter(q => 
        q.and(
          q.eq(q.field("isScheduled"), true),
          q.lte(q.field("scheduledAt"), args.currentTime),
          args.startOfDay ? q.gte(q.field("scheduledAt"), args.startOfDay) : q.eq(1, 1),
          q.or(
            q.eq(q.field("deliveryStatus"), undefined),
            q.eq(q.field("deliveryStatus"), "pending")
          )
        )
      )
      .take(args.limit || 50);

    // Enhance with message content and user details
    const enhancedMessages = await Promise.all(
      messages.map(async (message) => {
        let messageContent = "";
        let lessonTitle = "";
        let messageType = "custom";

        // Get message content
        if (message.predefinedMessageId) {
          const predefinedMessage = await ctx.db.get(message.predefinedMessageId);
          if (predefinedMessage) {
            messageContent = predefinedMessage.content;
            messageType = predefinedMessage.messageType;
          }
        } else if (message.customMessageId) {
          const customMessage = await ctx.db.get(message.customMessageId);
          if (customMessage) {
            messageContent = customMessage.content;
            messageType = "custom";
          }
        }

        // Get lesson details
        const lesson = await ctx.db.get(message.lessonId);
        lessonTitle = lesson?.title || "Unknown Lesson";

        // Get user details
        const user = await ctx.db.get(message.userId);

        return {
          id: message._id,
          userId: message.userId,
          lessonId: message.lessonId,
          messageContent,
          messageType,
          lessonTitle,
          scheduledAt: message.scheduledAt,
          deliveryAttempts: message.deliveryAttempts || 0,
          user: {
            name: user?.name,
            phone: user?.phone,
            email: user?.email
          }
        };
      })
    );

    // Aggregate by lessonId + scheduledAt + messageContent
    const groups = new Map<string, any[]>();
    for (const msg of enhancedMessages) {
      const key = `${String(msg.lessonId)}|${msg.scheduledAt}|${msg.messageContent}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(msg);
    }

    const aggregated: any[] = [];
    for (const [key, items] of groups) {
      const sample = items[0];
      const phones = items
        .map((i: any) => i.user?.phone)
        .filter((p: any) => typeof p === 'string' && p.length > 0);
      const messageIds = items.map((i: any) => String(i.id));
      aggregated.push({
        id: `agg:study:${key}`,
        userId: sample.userId,
        messageContent: sample.messageContent,
        messageType: sample.messageType,
        lessonTitle: sample.lessonTitle,
        scheduledAt: sample.scheduledAt,
        deliveryAttempts: items.reduce((acc: number, i: any) => acc + (i.deliveryAttempts || 0), 0),
        user: {
          name: undefined,
          phone: phones.join(','),
          email: undefined,
        },
        messageIds,
      });
    }

    return aggregated;
  }
});

// Bulk mark study messages delivered
export const markStudyMessagesDelivered = internalMutation({
  args: {
    messageIds: v.array(v.id("userSelectedMessages")),
    deliveredAt: v.number(),
    externalMessageId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    for (const id of args.messageIds) {
      await ctx.db.patch(id, {
        deliveryStatus: "sent",
        actualDeliveryTime: args.deliveredAt,
        deliveryError: undefined
      });
    }
  }
});

// Bulk mark study messages failed
export const markStudyMessagesFailed = internalMutation({
  args: {
    messageIds: v.array(v.id("userSelectedMessages")),
    error: v.string(),
    failedAt: v.number()
  },
  handler: async (ctx, args) => {
    for (const id of args.messageIds) {
      const message = await ctx.db.get(id);
      const attempts = ((message as any)?.deliveryAttempts || 0) + 1;
      await ctx.db.patch(id, {
        deliveryStatus: "failed",
        deliveryError: args.error,
        deliveryAttempts: attempts,
        lastDeliveryAttempt: args.failedAt
      });
    }
  }
});

// Internal mutation to mark study message as delivered via API
export const markStudyMessageDelivered = internalMutation({
  args: {
    messageId: v.id("userSelectedMessages"),
    deliveredAt: v.number(),
    externalMessageId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      deliveryStatus: "sent",
      actualDeliveryTime: args.deliveredAt,
      deliveryError: undefined
    });
  }
});

// Internal mutation to mark study message as failed via API
export const markStudyMessageFailed = internalMutation({
  args: {
    messageId: v.id("userSelectedMessages"),
    error: v.string(),
    failedAt: v.number()
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    const attempts = (message?.deliveryAttempts || 0) + 1;

    await ctx.db.patch(args.messageId, {
      deliveryStatus: "failed",
      deliveryError: args.error,
      deliveryAttempts: attempts,
      lastDeliveryAttempt: args.failedAt
    });
  }
});