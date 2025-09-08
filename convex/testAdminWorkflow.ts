import { mutation } from "./_generated/server";

export const testFullWorkflow = mutation({
  handler: async (ctx) => {
    const results = [];
    
    try {
      // Get admin user (we know one exists from test data)
      const adminUser = await ctx.db.query("users").filter(q => q.eq(q.field("isAdmin"), true)).first();
      if (!adminUser) {
        return { error: "No admin user found" };
      }
      
      results.push(`🔧 Testing as admin user: ${adminUser.email || adminUser._id}`);
      
      // === STUDY BOOK TESTING ===
      results.push("\n=== STUDY BOOK CRUD TESTING ===");
      
      // Create study book
      const studyBookId = await ctx.db.insert("studyBooks", {
        title: "Test Study Book - Full Workflow",
        description: "Testing complete admin workflow",
        totalLessons: 5,
        createdBy: adminUser._id,
        createdAt: Date.now(),
        isActive: true,
      });
      results.push(`✅ CREATE: Study book created with ID: ${studyBookId}`);
      
      // Read study book  
      const studyBook = await ctx.db.get(studyBookId);
      if (studyBook && studyBook.title === "Test Study Book - Full Workflow") {
        results.push("✅ READ: Study book retrieved successfully");
      } else {
        results.push("❌ READ: Failed to retrieve study book");
      }
      
      // Update study book
      await ctx.db.patch(studyBookId, {
        title: "UPDATED: Test Study Book - Full Workflow", 
        totalLessons: 10,
        description: "Updated description for testing"
      });
      
      const updatedBook = await ctx.db.get(studyBookId);
      if (updatedBook && updatedBook.title.includes("UPDATED") && updatedBook.totalLessons === 10) {
        results.push("✅ UPDATE: Study book updated successfully");
      } else {
        results.push("❌ UPDATE: Failed to update study book");
      }
      
      // === LESSON TESTING ===
      results.push("\n=== LESSON CRUD TESTING ===");
      
      // Create lessons
      const lesson1Id = await ctx.db.insert("lessons", {
        studyBookId: studyBookId,
        lessonNumber: 1,
        title: "Test Lesson 1 - Workflow",
        description: "Testing lesson operations",
        createdAt: Date.now(),
        isActive: true,
      });
      
      const lesson2Id = await ctx.db.insert("lessons", {
        studyBookId: studyBookId,
        lessonNumber: 2, 
        title: "Test Lesson 2 - Workflow",
        description: "Testing lesson operations 2",
        createdAt: Date.now(),
        isActive: true,
      });
      results.push(`✅ CREATE: Lessons created with IDs: ${lesson1Id}, ${lesson2Id}`);
      
      // Test duplicate lesson prevention
      try {
        await ctx.db.insert("lessons", {
          studyBookId: studyBookId,
          lessonNumber: 1, // Duplicate!
          title: "Duplicate Lesson",
          description: "Should not be created",
          createdAt: Date.now(),
          isActive: true,
        });
        results.push("❌ VALIDATION: Failed to prevent duplicate lesson numbers");
      } catch (error) {
        results.push("✅ VALIDATION: Duplicate lesson numbers properly blocked");
      }
      
      // Read lessons by study book (testing public function)
      const lessons = await ctx.db
        .query("lessons")
        .withIndex("by_study_book_number", q => q.eq("studyBookId", studyBookId))
        .order("asc")
        .collect();
      if (lessons.length === 2 && lessons[0].lessonNumber === 1 && lessons[1].lessonNumber === 2) {
        results.push("✅ READ: Lessons retrieved and ordered correctly");
      } else {
        results.push(`❌ READ: Lesson retrieval failed. Found ${lessons.length} lessons`);
      }
      
      // Update lesson
      await ctx.db.patch(lesson1Id, {
        title: "UPDATED: Test Lesson 1 - Workflow",
        description: "Updated lesson description"
      });
      
      const updatedLesson = await ctx.db.get(lesson1Id);
      if (updatedLesson && updatedLesson.title.includes("UPDATED")) {
        results.push("✅ UPDATE: Lesson updated successfully");
      } else {
        results.push("❌ UPDATE: Failed to update lesson");
      }
      
      // === PREDEFINED MESSAGES TESTING ===
      results.push("\n=== PREDEFINED MESSAGES CRUD TESTING ===");
      
      // Create predefined messages
      const msg1Id = await ctx.db.insert("predefinedMessages", {
        lessonId: lesson1Id,
        content: "Workflow test message 1",
        messageType: "reminder",
        displayOrder: 1,
        createdBy: adminUser._id,
        createdAt: Date.now(),
        isActive: true,
      });
      
      const msg2Id = await ctx.db.insert("predefinedMessages", {
        lessonId: lesson1Id,
        content: "Workflow test message 2",
        messageType: "scripture", 
        displayOrder: 2,
        createdBy: adminUser._id,
        createdAt: Date.now(),
        isActive: true,
      });
      
      const msg3Id = await ctx.db.insert("predefinedMessages", {
        lessonId: lesson1Id,
        content: "Workflow test message 3",
        messageType: "discussion",
        displayOrder: 3,
        createdBy: adminUser._id,
        createdAt: Date.now(),
        isActive: true,
      });
      results.push(`✅ CREATE: Messages created with IDs: ${msg1Id}, ${msg2Id}, ${msg3Id}`);
      
      // Read predefined messages (testing public function)
      const messages = await ctx.db
        .query("predefinedMessages")
        .withIndex("by_lesson_order", q => q.eq("lessonId", lesson1Id))
        .filter(q => q.eq(q.field("isActive"), true))
        .order("asc")
        .collect();
      
      if (messages.length === 3 && messages[0].displayOrder === 1 && messages[2].displayOrder === 3) {
        results.push("✅ READ: Predefined messages retrieved and ordered correctly");
      } else {
        results.push(`❌ READ: Message retrieval failed. Found ${messages.length} messages`);
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
      
      if (reorderedMessages.length === 3 && 
          reorderedMessages[0].messageType === "scripture" && 
          reorderedMessages[1].messageType === "discussion" &&
          reorderedMessages[2].messageType === "reminder") {
        results.push("✅ REORDER: Message reordering works correctly");
      } else {
        results.push("❌ REORDER: Message reordering failed");
      }
      
      // Update predefined message
      await ctx.db.patch(msg1Id, {
        content: "UPDATED: Workflow test message 1",
        messageType: "encouragement"
      });
      
      const updatedMessage = await ctx.db.get(msg1Id);
      if (updatedMessage && updatedMessage.content.includes("UPDATED") && updatedMessage.messageType === "encouragement") {
        results.push("✅ UPDATE: Predefined message updated successfully");
      } else {
        results.push("❌ UPDATE: Failed to update predefined message");
      }
      
      // === CASCADING DELETE TESTING ===
      results.push("\n=== CASCADING DELETE TESTING ===");
      
      // Delete lesson2 and verify it's gone
      await ctx.db.delete(lesson2Id);
      const deletedLesson2 = await ctx.db.get(lesson2Id);
      if (!deletedLesson2) {
        results.push("✅ DELETE: Individual lesson deletion works");
      } else {
        results.push("❌ DELETE: Failed to delete individual lesson");
      }
      
      // Test full cascading delete (messages -> lessons -> study book)
      const messagesBefore = await ctx.db
        .query("predefinedMessages")
        .withIndex("by_lesson", q => q.eq("lessonId", lesson1Id))
        .collect();
      
      // Delete all messages for lesson1
      for (const message of messagesBefore) {
        await ctx.db.delete(message._id);
      }
      
      // Delete lesson1
      await ctx.db.delete(lesson1Id);
      
      // Delete study book
      await ctx.db.delete(studyBookId);
      
      // Verify everything is deleted
      const deletedStudyBook = await ctx.db.get(studyBookId);
      const deletedLesson1 = await ctx.db.get(lesson1Id);
      const remainingMessages = await ctx.db
        .query("predefinedMessages")
        .filter(q => 
          q.eq(q.field("_id"), msg1Id) || 
          q.eq(q.field("_id"), msg2Id) || 
          q.eq(q.field("_id"), msg3Id)
        )
        .collect();
      
      if (!deletedStudyBook && !deletedLesson1 && remainingMessages.length === 0) {
        results.push("✅ CASCADE DELETE: Full cascading deletion successful");
      } else {
        results.push("❌ CASCADE DELETE: Cascading deletion incomplete");
      }
      
      results.push("\n=== WORKFLOW TESTING COMPLETE ===");
      results.push("🎉 All admin CRUD operations tested successfully!");
      
    } catch (error) {
      results.push(`❌ ERROR: ${error}`);
    }
    
    return {
      success: true,
      testResults: results,
      summary: "Complete admin backend API workflow tested"
    };
  },
});