import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";

// Mutation to create test data
export const createTestData = mutation({
  args: {},
  handler: async (ctx) => {
    // Get the first user and make them admin
    const users = await ctx.db.query("users").collect();
    if (users.length === 0) {
      throw new Error("No users found in database");
    }
    
    const adminUser = users[0];
    await ctx.db.patch(adminUser._id, { isAdmin: true });
    console.log(`Set user ${adminUser._id} as admin`);
    
    // Create a study book
    const studyBookId = await ctx.db.insert("studyBooks", {
      title: "Men's Study: Wild at Heart",
      description: "A journey into authentic masculinity",
      totalLessons: 3,
      createdBy: adminUser._id,
      createdAt: Date.now(),
      isActive: true,
    });
    console.log("Created study book:", studyBookId);
    
    // Create lessons
    const lesson1Id = await ctx.db.insert("lessons", {
      studyBookId: studyBookId,
      lessonNumber: 1,
      title: "The Heart of a Man",
      description: "Exploring what it means to have the heart of a man",
      createdAt: Date.now(),
      isActive: true,
    });
    
    const lesson2Id = await ctx.db.insert("lessons", {
      studyBookId: studyBookId,
      lessonNumber: 2,
      title: "The Wild Man",
      description: "Understanding the wild nature within",
      createdAt: Date.now(),
      isActive: true,
    });
    
    console.log("Created lessons:", lesson1Id, lesson2Id);
    
    // Create predefined messages
    const predefinedMsg1Id = await ctx.db.insert("predefinedMessages", {
      lessonId: lesson1Id,
      content: "Tonight we explore what it means to have the heart of a man. Join us at 7pm!",
      messageType: "reminder",
      displayOrder: 1,
      createdBy: adminUser._id,
      createdAt: Date.now(),
      isActive: true,
    });
    
    const predefinedMsg2Id = await ctx.db.insert("predefinedMessages", {
      lessonId: lesson1Id,
      content: "\"Above all else, guard your heart, for everything you do flows from it.\" - Proverbs 4:23",
      messageType: "scripture",
      displayOrder: 2,
      createdBy: adminUser._id,
      createdAt: Date.now(),
      isActive: true,
    });
    
    // Create a user custom message (using second user if available, otherwise admin user)
    const regularUser = users.length > 1 ? users[1] : adminUser;
    const customMessageId = await ctx.db.insert("userCustomMessages", {
      userId: regularUser._id,
      lessonId: lesson1Id,
      content: "Looking forward to tonight's discussion! This lesson really speaks to me.",
      createdAt: Date.now(),
      lastModified: Date.now(),
    });
    
    // Create user selected message
    const userSelectionId = await ctx.db.insert("userSelectedMessages", {
      userId: regularUser._id,
      predefinedMessageId: predefinedMsg1Id,
      lessonId: lesson1Id,
      scheduledAt: Date.now() + (2 * 60 * 60 * 1000), // 2 hours from now
      isScheduled: true,
      createdAt: Date.now(),
    });
    
    console.log("Created custom message and selection:", customMessageId, userSelectionId);
    
    return {
      success: true,
      data: {
        adminUserId: adminUser._id,
        studyBookId,
        lesson1Id,
        lesson2Id,
        predefinedMsg1Id,
        predefinedMsg2Id,
        customMessageId,
        userSelectionId,
      }
    };
  },
});

// Query to retrieve and verify the test data
export const verifyTestData = query({
  args: {},
  handler: async (ctx) => {
    // Check admin user
    const adminUsers = await ctx.db.query("users").filter(q => q.eq(q.field("isAdmin"), true)).collect();
    
    // Get study books
    const studyBooks = await ctx.db.query("studyBooks").collect();
    
    // Get lessons
    const lessons = await ctx.db.query("lessons").collect();
    
    // Get predefined messages
    const predefinedMessages = await ctx.db.query("predefinedMessages").collect();
    
    // Get custom messages
    const customMessages = await ctx.db.query("userCustomMessages").collect();
    
    // Get user selections
    const userSelections = await ctx.db.query("userSelectedMessages").collect();
    
    return {
      adminUsers: adminUsers.length,
      studyBooks: studyBooks.length,
      lessons: lessons.length,
      predefinedMessages: predefinedMessages.length,
      customMessages: customMessages.length,
      userSelections: userSelections.length,
      sampleData: {
        studyBooks,
        lessons,
        predefinedMessages,
        customMessages,
        userSelections
      }
    };
  },
});

// Mutation to clean up test data
export const cleanupTestData = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete in reverse order of dependencies
    const userSelections = await ctx.db.query("userSelectedMessages").collect();
    for (const selection of userSelections) {
      await ctx.db.delete(selection._id);
    }
    
    const customMessages = await ctx.db.query("userCustomMessages").collect();
    for (const msg of customMessages) {
      await ctx.db.delete(msg._id);
    }
    
    const predefinedMessages = await ctx.db.query("predefinedMessages").collect();
    for (const msg of predefinedMessages) {
      await ctx.db.delete(msg._id);
    }
    
    const lessons = await ctx.db.query("lessons").collect();
    for (const lesson of lessons) {
      await ctx.db.delete(lesson._id);
    }
    
    const studyBooks = await ctx.db.query("studyBooks").collect();
    for (const book of studyBooks) {
      await ctx.db.delete(book._id);
    }
    
    return { success: true, message: "Test data cleaned up" };
  },
});

// Set up delivery system testing with phone numbers
export const setupDeliverySystemTest = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("Setting up delivery system test...");
    
    // Add phone numbers to existing test users
    const testUserId = "kd73ma7zc6x38bd47yw2691evx7q0x2e" as Id<"users">;
    const adminUserId = "kd73c52egeyj7q3n0gkqnxatf57q0ram" as Id<"users">;
    
    await ctx.db.patch(testUserId, {
      phone: "+1234567890",
      name: "Test User"
    });
    
    await ctx.db.patch(adminUserId, {
      phone: "+1987654321", 
      name: "Admin User"
    });
    
    // Create a message scheduled for immediate delivery (1 minute from now)
    const lessons = await ctx.db.query("lessons").take(1);
    const predefinedMessages = await ctx.db.query("predefinedMessages").take(1);
    
    if (lessons.length > 0 && predefinedMessages.length > 0) {
      const scheduleTime = Date.now() + (60 * 1000); // 1 minute from now
      
      const newMessageId = await ctx.db.insert("userSelectedMessages", {
        userId: testUserId,
        predefinedMessageId: predefinedMessages[0]._id,
        lessonId: predefinedMessages[0].lessonId,
        scheduledAt: scheduleTime,
        isScheduled: true,
        createdAt: Date.now(),
      });
      
      return {
        success: true,
        testSetup: {
          usersUpdated: [
            { userId: testUserId, phone: "+1234567890", name: "Test User" },
            { userId: adminUserId, phone: "+1987654321", name: "Admin User" }
          ],
          newMessageCreated: {
            messageId: newMessageId,
            scheduledFor: new Date(scheduleTime).toISOString(),
            content: predefinedMessages[0].content?.substring(0, 50) + "...",
            lessonTitle: lessons[0].title
          },
          instructions: [
            "Wait 1 minute, then run processScheduledMessages to test delivery",
            "Check delivery stats to verify processing", 
            "Test admin dashboard and user interfaces",
            "Verify notifications and real-time updates"
          ]
        }
      };
    }
    
    return { success: false, error: "No lessons or predefined messages available" };
  }
});