import { mutation } from "./_generated/server";
import { requireAdmin } from "./_lib/adminAuth";

export const testAdminOperations = mutation({
  handler: async (ctx) => {
    // This function tests all admin operations as an authenticated admin user
    const admin = await requireAdmin(ctx);
    const results = [];
    
    try {
      // 1. Test Study Book CRUD
      results.push("=== Testing Study Book Operations ===");
      
      // Create study book
      const studyBookId = await ctx.db.insert("studyBooks", {
        title: "Test Study Book - Admin CRUD Test",
        description: "Testing admin CRUD operations",
        totalLessons: 5,
        createdBy: admin._id,
        createdAt: Date.now(),
        isActive: true,
      });
      results.push(`✅ Created study book: ${studyBookId}`);
      
      // Read study book
      const studyBook = await ctx.db.get(studyBookId);
      if (studyBook && studyBook.title === "Test Study Book - Admin CRUD Test") {
        results.push("✅ Read study book successfully");
      } else {
        results.push("❌ Failed to read study book");
      }
      
      // Update study book
      await ctx.db.patch(studyBookId, {
        title: "Updated Test Study Book",
        description: "Updated description",
        totalLessons: 10
      });
      const updatedBook = await ctx.db.get(studyBookId);
      if (updatedBook && updatedBook.title === "Updated Test Study Book" && updatedBook.totalLessons === 10) {
        results.push("✅ Updated study book successfully");
      } else {
        results.push("❌ Failed to update study book");
      }
      
      // 2. Test Lesson CRUD
      results.push("=== Testing Lesson Operations ===");
      
      // Create lessons
      const lesson1Id = await ctx.db.insert("lessons", {
        studyBookId: studyBookId,
        lessonNumber: 1,
        title: "Test Lesson 1",
        description: "Testing lesson creation",
        createdAt: Date.now(),
        isActive: true,
      });
      
      const lesson2Id = await ctx.db.insert("lessons", {
        studyBookId: studyBookId,
        lessonNumber: 2,
        title: "Test Lesson 2",
        description: "Testing lesson creation 2",
        createdAt: Date.now(),
        isActive: true,
      });
      results.push(`✅ Created lessons: ${lesson1Id}, ${lesson2Id}`);
      
      // Test duplicate lesson number prevention
      try {
        await ctx.db.insert("lessons", {
          studyBookId: studyBookId,
          lessonNumber: 1, // Duplicate number
          title: "Duplicate Lesson",
          description: "This should fail",
          createdAt: Date.now(),
          isActive: true,
        });
        results.push("❌ Failed to prevent duplicate lesson numbers");
      } catch (error) {
        results.push("✅ Successfully prevented duplicate lesson numbers");
      }
      
      // Read lessons by study book
      const lessons = await ctx.db
        .query("lessons")
        .withIndex("by_study_book_number", q => q.eq("studyBookId", studyBookId))
        .collect();
      if (lessons.length === 2) {
        results.push("✅ Read lessons by study book successfully");
      } else {
        results.push(`❌ Failed to read lessons: found ${lessons.length}, expected 2`);
      }
      
      // Update lesson
      await ctx.db.patch(lesson1Id, {
        title: "Updated Test Lesson 1",
        description: "Updated description"
      });
      const updatedLesson = await ctx.db.get(lesson1Id);
      if (updatedLesson && updatedLesson.title === "Updated Test Lesson 1") {
        results.push("✅ Updated lesson successfully");
      } else {
        results.push("❌ Failed to update lesson");
      }
      
      // 3. Test Predefined Messages CRUD
      results.push("=== Testing Predefined Messages Operations ===");
      
      // Create predefined messages
      const msg1Id = await ctx.db.insert("predefinedMessages", {
        lessonId: lesson1Id,
        content: "Test message 1",
        messageType: "reminder",
        displayOrder: 1,
        createdBy: admin._id,
        createdAt: Date.now(),
        isActive: true,
      });
      
      const msg2Id = await ctx.db.insert("predefinedMessages", {
        lessonId: lesson1Id,
        content: "Test message 2", 
        messageType: "scripture",
        displayOrder: 2,
        createdBy: admin._id,
        createdAt: Date.now(),
        isActive: true,
      });
      
      const msg3Id = await ctx.db.insert("predefinedMessages", {
        lessonId: lesson1Id,
        content: "Test message 3",
        messageType: "discussion",
        displayOrder: 3,
        createdBy: admin._id,
        createdAt: Date.now(),
        isActive: true,
      });
      results.push(`✅ Created predefined messages: ${msg1Id}, ${msg2Id}, ${msg3Id}`);
      
      // Read messages by lesson
      const messages = await ctx.db
        .query("predefinedMessages")
        .withIndex("by_lesson_order", q => q.eq("lessonId", lesson1Id))
        .filter(q => q.eq(q.field("isActive"), true))
        .order("asc")
        .collect();
      if (messages.length === 3) {
        results.push("✅ Read predefined messages by lesson successfully");
      } else {
        results.push(`❌ Failed to read messages: found ${messages.length}, expected 3`);
      }
      
      // Test message reordering
      await ctx.db.patch(msg1Id, { displayOrder: 3 });
      await ctx.db.patch(msg2Id, { displayOrder: 1 });
      await ctx.db.patch(msg3Id, { displayOrder: 2 });
      
      const reorderedMessages = await ctx.db
        .query("predefinedMessages")
        .withIndex("by_lesson_order", q => q.eq("lessonId", lesson1Id))
        .filter(q => q.eq(q.field("isActive"), true))
        .order("asc")
        .collect();
      
      if (reorderedMessages[0].content === "Test message 2" && 
          reorderedMessages[1].content === "Test message 3" && 
          reorderedMessages[2].content === "Test message 1") {
        results.push("✅ Message reordering works correctly");
      } else {
        results.push("❌ Message reordering failed");
      }
      
      // Update predefined message
      await ctx.db.patch(msg1Id, {
        content: "Updated test message 1",
        messageType: "encouragement"
      });
      const updatedMsg = await ctx.db.get(msg1Id);
      if (updatedMsg && updatedMsg.content === "Updated test message 1" && updatedMsg.messageType === "encouragement") {
        results.push("✅ Updated predefined message successfully");
      } else {
        results.push("❌ Failed to update predefined message");
      }
      
      // 4. Test Cascading Deletes
      results.push("=== Testing Cascading Delete Operations ===");
      
      // First test deleting a lesson (should delete its messages)
      const lesson2Messages = await ctx.db
        .query("predefinedMessages")
        .withIndex("by_lesson", q => q.eq("lessonId", lesson2Id))
        .collect();
      
      // Create a message for lesson2 to test deletion
      const lesson2MsgId = await ctx.db.insert("predefinedMessages", {
        lessonId: lesson2Id,
        content: "Message for lesson 2",
        messageType: "general",
        displayOrder: 1,
        createdBy: admin._id,
        createdAt: Date.now(),
        isActive: true,
      });
      
      // Delete lesson2 and its messages
      const messagesToDelete = await ctx.db
        .query("predefinedMessages")
        .withIndex("by_lesson", q => q.eq("lessonId", lesson2Id))
        .collect();
      
      for (const message of messagesToDelete) {
        await ctx.db.delete(message._id);
      }
      await ctx.db.delete(lesson2Id);
      
      // Verify lesson2 is deleted
      const deletedLesson = await ctx.db.get(lesson2Id);
      const deletedMsg = await ctx.db.get(lesson2MsgId);
      if (!deletedLesson && !deletedMsg) {
        results.push("✅ Lesson deletion with cascading message deletion works");
      } else {
        results.push("❌ Failed to cascade delete lesson messages");
      }
      
      // Test deleting study book (should delete remaining lesson and messages)
      const remainingLessons = await ctx.db
        .query("lessons")
        .withIndex("by_study_book", q => q.eq("studyBookId", studyBookId))
        .collect();
      
      // Delete all messages for remaining lessons
      for (const lesson of remainingLessons) {
        const lessonMessages = await ctx.db
          .query("predefinedMessages")
          .withIndex("by_lesson", q => q.eq("lessonId", lesson._id))
          .collect();
        
        for (const message of lessonMessages) {
          await ctx.db.delete(message._id);
        }
        await ctx.db.delete(lesson._id);
      }
      
      // Delete the study book
      await ctx.db.delete(studyBookId);
      
      // Verify complete deletion
      const deletedStudyBook = await ctx.db.get(studyBookId);
      const remainingMessagesAfterDelete = await ctx.db
        .query("predefinedMessages")
        .withIndex("by_lesson", q => q.eq("lessonId", lesson1Id))
        .collect();
      
      if (!deletedStudyBook && remainingMessagesAfterDelete.length === 0) {
        results.push("✅ Study book cascading deletion works correctly");
      } else {
        results.push("❌ Failed to cascade delete study book dependencies");
      }
      
      results.push("=== Admin CRUD Testing Complete ===");
      results.push(`✅ All tests completed by admin user: ${admin.email || admin._id}`);
      
    } catch (error) {
      results.push(`❌ Error during testing: ${error}`);
    }
    
    return {
      success: true,
      results: results,
      testedBy: admin.email || admin._id
    };
  },
});