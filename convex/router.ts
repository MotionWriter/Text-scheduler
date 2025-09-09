import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

const http = httpRouter();

// Helper function to parse timestamps - accepts both Unix timestamps (numbers) and ISO 8601 strings
function parseTimestamp(timestamp: string | number): number {
  if (typeof timestamp === 'number') {
    // Unix timestamp (milliseconds)
    return timestamp;
  }
  if (typeof timestamp === 'string') {
    // ISO 8601 string - parse to Unix timestamp
    const parsed = new Date(timestamp).getTime();
    if (isNaN(parsed)) {
      throw new Error(`Invalid timestamp format: ${timestamp}`);
    }
    return parsed;
  }
  throw new Error(`Invalid timestamp type: ${typeof timestamp}`);
}

// API endpoint for Apple Shortcut to fetch pending messages
http.route({
  path: "/api/messages/pending",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
    const url = new URL(request.url);
    const category = url.searchParams.get("category") || undefined;

    // Optional filters
    const todayOnly = url.searchParams.get("todayOnly") !== "false"; // Default to true
    const groupOnly = url.searchParams.get("groupOnly") === "true";
    
    // Calculate today's date range on server
    let startOfDay: number | undefined;
    let endOfDay: number | undefined;
    
    if (todayOnly) {
      const now = new Date();
      const startOfDayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfDayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      startOfDay = startOfDayDate.getTime();
      endOfDay = endOfDayDate.getTime();
    }
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      // Validate API key, update lastUsed, and detect first use
      const usage = await ctx.runMutation(internal.apiKeys.touchUsageByApiKey, { apiKey });
      if (!usage) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // If the key was just deactivated due to grace expiry, reject this request
      if (usage.deactivatedOnGrace) {
        return new Response(JSON.stringify({ error: "API key expired (grace period ended)" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { userId, isFirstUse, replacesKeyId } = usage as any;

      // On first successful call from this API key, mark the user as verified
      if (isFirstUse) {
        await ctx.runMutation(internal.userVerification.markUserAsVerified, { userId });
        // If this new key replaces an older key, deactivate the old key now
        if (replacesKeyId) {
          await ctx.runMutation(internal.apiKeys.deactivate, { keyId: replacesKeyId });
        }
      }

      // Sync grouped messages with current group membership and return pending
      const messages = await ctx.runMutation(internal.api.getPendingMessagesCurrentGroup, { 
        userId,
        category,
        startOfDay: Number.isFinite(startOfDay as number) ? (startOfDay as number) : undefined,
        endOfDay: Number.isFinite(endOfDay as number) ? (endOfDay as number) : undefined,
        groupOnly,
      });
      
      // Debug metadata for easier client-side verification
      const serverNow = Date.now();
      const startOfDayIso = startOfDay ? new Date(startOfDay).toISOString() : undefined;
      const endOfDayIso = endOfDay ? new Date(endOfDay).toISOString() : undefined;

      // Add ISO 8601 timestamps to messages for easier Apple Shortcuts usage
      const messagesWithIso = messages.map((msg: any) => ({
        ...msg,
        scheduledForIso: new Date(msg.scheduledFor).toISOString()
      }));

      return new Response(JSON.stringify({ 
        messages: messagesWithIso,
        count: messages.length,
        serverNow,
        serverNowIso: new Date(serverNow).toISOString(),
        todayOnly,
        startOfDay,
        startOfDayIso,
        endOfDay,
        endOfDayIso,
        groupOnly,
        category,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        verifiedOnFirstUse: isFirstUse || false
      }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// API endpoint to mark message as sent
http.route({
  path: "/api/messages/sent",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();
      const { messageId, messageIds, sentAt } = body as any;

      if ((!messageId && !messageIds) || !sentAt) {
        return new Response(JSON.stringify({ error: "messageId or messageIds and sentAt are required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Parse timestamp (supports both Unix timestamps and ISO 8601 strings)
      let parsedSentAt: number;
      try {
        parsedSentAt = parseTimestamp(sentAt);
      } catch (error) {
        return new Response(JSON.stringify({ error: `Invalid sentAt format: ${error}` }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const userId = await ctx.runQuery(internal.apiAuth.validateApiKey, { apiKey });
      if (!userId) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (Array.isArray(messageIds)) {
        await ctx.runMutation(internal.api.markMessagesAsSent, {
          userId,
          messageIds,
          sentAt: parsedSentAt,
        });
      } else {
        await ctx.runMutation(internal.api.markMessageAsSent, {
          userId,
          messageId,
          sentAt: parsedSentAt,
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// API endpoint to mark message as failed
http.route({
  path: "/api/messages/failed",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();
      const { messageId, messageIds, error: errorMessage } = body as any;

      if (!messageId && !messageIds) {
        return new Response(JSON.stringify({ error: "messageId or messageIds is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const userId = await ctx.runQuery(internal.apiAuth.validateApiKey, { apiKey });
      if (!userId) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (Array.isArray(messageIds)) {
        await ctx.runMutation(internal.api.markMessagesAsFailed, {
          userId,
          messageIds,
          notes: errorMessage,
        });
      } else {
        await ctx.runMutation(internal.api.markMessageAsFailed, {
          userId,
          messageId,
          notes: errorMessage,
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// API endpoint to get pending study book messages for delivery
http.route({
  path: "/api/study-messages/pending",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const startOfDayParam = url.searchParams.get("startOfDay");
    const startOfDay = startOfDayParam ? Number(startOfDayParam) : undefined;
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const userId = await ctx.runQuery(internal.apiAuth.validateApiKey, { apiKey });
      if (!userId) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Get pending messages from userSelectedMessages table
      const now = Date.now();
      const messages = await ctx.runQuery(internal.smsDelivery.getPendingStudyMessages, { 
        userId,
        currentTime: now,
        limit,
        startOfDay: Number.isFinite(startOfDay as number) ? (startOfDay as number) : undefined,
      });
      
      // Debug metadata similar to /api/messages/pending
      const serverNow = now;
      const startOfDayIso = Number.isFinite(startOfDay as number)
        ? new Date(startOfDay as number).toISOString()
        : undefined;

      // Add ISO 8601 timestamps to study messages for easier Apple Shortcuts usage
      const messagesWithIso = messages.map((msg: any) => ({
        ...msg,
        scheduledAtIso: msg.scheduledAt ? new Date(msg.scheduledAt).toISOString() : undefined
      }));

      return new Response(JSON.stringify({ 
        messages: messagesWithIso,
        count: messages.length,
        serverNow,
        serverNowIso: new Date(serverNow).toISOString(),
        startOfDay: Number.isFinite(startOfDay as number) ? (startOfDay as number) : undefined,
        startOfDayIso,
        timezoneOffsetMinutes: new Date().getTimezoneOffset()
      }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
      });
    } catch (error) {
      console.error("API Error:", error);
      return new Response(JSON.stringify({ 
        error: "Internal server error",
        details: String(error)
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// API endpoint to mark study message as delivered
http.route({
  path: "/api/study-messages/delivered",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();
      const { messageId, messageIds, deliveredAt, externalMessageId } = body as any;

      if ((!messageId && !messageIds) || !deliveredAt) {
        return new Response(JSON.stringify({ 
          error: "messageId or messageIds and deliveredAt are required" 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Parse timestamp (supports both Unix timestamps and ISO 8601 strings)
      let parsedDeliveredAt: number;
      try {
        parsedDeliveredAt = parseTimestamp(deliveredAt);
      } catch (error) {
        return new Response(JSON.stringify({ error: `Invalid deliveredAt format: ${error}` }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const userId = await ctx.runQuery(internal.apiAuth.validateApiKey, { apiKey });
      if (!userId) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (Array.isArray(messageIds)) {
        await ctx.runMutation(internal.smsDelivery.markStudyMessagesDelivered, {
          messageIds,
          deliveredAt: parsedDeliveredAt,
          externalMessageId
        });
      } else {
        await ctx.runMutation(internal.smsDelivery.markStudyMessageDelivered, {
          messageId,
          deliveredAt: parsedDeliveredAt,
          externalMessageId
        });
      }

      return new Response(JSON.stringify({ 
        success: true,
        messageId: messageId || messageIds,
        deliveredAt 
      }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
      });
    } catch (error) {
      console.error("API Error:", error);
      return new Response(JSON.stringify({ 
        error: "Internal server error",
        details: String(error)
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// API endpoint to mark study message as failed
http.route({
  path: "/api/study-messages/failed",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();
      const { messageId, messageIds, error: errorMessage, failedAt } = body as any;

      if (!messageId && !messageIds) {
        return new Response(JSON.stringify({ error: "messageId or messageIds is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const userId = await ctx.runQuery(internal.apiAuth.validateApiKey, { apiKey });
      if (!userId) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Parse timestamp (supports both Unix timestamps and ISO 8601 strings, defaults to current time)
      let parsedFailedAt: number;
      if (failedAt) {
        try {
          parsedFailedAt = parseTimestamp(failedAt);
        } catch (error) {
          return new Response(JSON.stringify({ error: `Invalid failedAt format: ${error}` }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      } else {
        parsedFailedAt = Date.now();
      }

      if (Array.isArray(messageIds)) {
        await ctx.runMutation(internal.smsDelivery.markStudyMessagesFailed, {
          messageIds,
          error: errorMessage || 'Delivery failed',
          failedAt: parsedFailedAt
        });
      } else {
        await ctx.runMutation(internal.smsDelivery.markStudyMessageFailed, {
          messageId,
          error: errorMessage || 'Delivery failed',
          failedAt: parsedFailedAt
        });
      }

      return new Response(JSON.stringify({ 
        success: true,
        messageId: messageId || messageIds,
        error: errorMessage 
      }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
      });
    } catch (error) {
      console.error("API Error:", error);
      return new Response(JSON.stringify({ 
        error: "Internal server error",
        details: String(error)
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// API endpoint to get delivery statistics  
http.route({
  path: "/api/study-messages/stats",
  method: "GET", 
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
    const url = new URL(request.url);
    const timeRangeHours = parseInt(url.searchParams.get("timeRange") || "24");
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const userId = await ctx.runQuery(internal.apiAuth.validateApiKey, { apiKey });
      if (!userId) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const stats = await ctx.runQuery(internal.messageScheduler.getDeliveryStats, { 
        timeRangeHours 
      });
      
      return new Response(JSON.stringify({
        ...stats,
        timestamp: Date.now()
      }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
      });
    } catch (error) {
      console.error("API Error:", error);
      return new Response(JSON.stringify({ 
        error: "Internal server error",
        details: String(error)
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// API endpoint for Apple Shortcut verification test
http.route({
  path: "/api/verify",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const userId = await ctx.runQuery(internal.apiAuth.validateApiKey, { apiKey });
      if (!userId) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Mark user as verified
      await ctx.runMutation(internal.userVerification.markUserAsVerified, { userId });
      
      return new Response(JSON.stringify({ 
        success: true,
        message: "Apple Shortcut verification successful! Your account is now activated.",
        userId
      }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
      });
    } catch (error) {
      console.error("Verification API Error:", error);
      return new Response(JSON.stringify({ 
        error: "Internal server error",
        details: String(error)
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
