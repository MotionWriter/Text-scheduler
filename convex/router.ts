import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

const http = httpRouter();

// API endpoint for Apple Shortcut to fetch pending messages
http.route({
  path: "/api/messages/pending",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
    const url = new URL(request.url);
    const category = url.searchParams.get("category") || undefined;
    
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

      const messages = await ctx.runQuery(internal.api.getPendingMessages, { 
        userId,
        category,
      });
      
      return new Response(JSON.stringify({ messages }), {
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
      const { messageId, sentAt } = body;

      if (!messageId || !sentAt) {
        return new Response(JSON.stringify({ error: "messageId and sentAt are required" }), {
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

      await ctx.runMutation(internal.api.markMessageAsSent, {
        userId,
        messageId,
        sentAt,
      });

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
      const { messageId, error: errorMessage } = body;

      if (!messageId) {
        return new Response(JSON.stringify({ error: "messageId is required" }), {
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

      await ctx.runMutation(internal.api.markMessageAsFailed, {
        userId,
        messageId,
        notes: errorMessage,
      });

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
        limit 
      });
      
      return new Response(JSON.stringify({ 
        messages,
        timestamp: now,
        count: messages.length 
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
      const { messageId, deliveredAt, externalMessageId } = body;

      if (!messageId || !deliveredAt) {
        return new Response(JSON.stringify({ 
          error: "messageId and deliveredAt are required" 
        }), {
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

      await ctx.runMutation(internal.smsDelivery.markStudyMessageDelivered, {
        messageId,
        deliveredAt,
        externalMessageId
      });

      return new Response(JSON.stringify({ 
        success: true,
        messageId,
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
      const { messageId, error: errorMessage, failedAt } = body;

      if (!messageId) {
        return new Response(JSON.stringify({ error: "messageId is required" }), {
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

      await ctx.runMutation(internal.smsDelivery.markStudyMessageFailed, {
        messageId,
        error: errorMessage || "Delivery failed",
        failedAt: failedAt || Date.now()
      });

      return new Response(JSON.stringify({ 
        success: true,
        messageId,
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

export default http;
