import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  contacts: defineTable({
    userId: v.id("users"),
    name: v.string(),
    phoneNumber: v.string(),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  groups: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  groupMemberships: defineTable({
    userId: v.id("users"),
    groupId: v.id("groups"),
    contactId: v.id("contacts"),
  })
    .index("by_user", ["userId"])
    .index("by_group", ["groupId"])
    .index("by_contact", ["contactId"])
    .index("by_group_and_contact", ["groupId", "contactId"]),

  messageTemplates: defineTable({
    userId: v.id("users"),
    name: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  scheduledMessages: defineTable({
    userId: v.id("users"),
    contactId: v.id("contacts"),
    groupId: v.optional(v.id("groups")),
    templateId: v.optional(v.id("messageTemplates")),
    message: v.string(),
    scheduledFor: v.number(), // timestamp
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed")),
    sentAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    category: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_scheduled_time", ["scheduledFor"])
    .index("by_category", ["category"])
    .index("by_group", ["groupId"]),

  apiKeys: defineTable({
    userId: v.id("users"),
    keyHash: v.string(),
    name: v.string(),
    lastUsed: v.optional(v.number()),
    isActive: v.boolean(),
    // Rotation metadata
    replacesKeyId: v.optional(v.id("apiKeys")),
    graceUntil: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_key_hash", ["keyHash"])
    .index("by_replaces", ["replacesKeyId"]),

  // New core tables for study book system
  studyBooks: defineTable({
    title: v.string(),
    description: v.string(),
    totalLessons: v.number(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_active", ["isActive"])
    .index("by_creator", ["createdBy"]),

  lessons: defineTable({
    studyBookId: v.id("studyBooks"),
    lessonNumber: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    isActive: v.boolean(),
    // Scheduling configuration for Study Messages
    // activeWeekStart: start of the active week in ms (local midnight recommended)
    activeWeekStart: v.optional(v.number()),
    // defaultSendTime: "HH:mm" (24h)
    defaultSendTime: v.optional(v.string()),
  })
    .index("by_study_book", ["studyBookId"]) 
    .index("by_study_book_number", ["studyBookId", "lessonNumber"]) 
    .index("by_active", ["isActive"]),

  predefinedMessages: defineTable({
    lessonId: v.id("lessons"),
    content: v.string(),
    messageType: v.string(),
    displayOrder: v.number(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_lesson", ["lessonId"])
    .index("by_lesson_order", ["lessonId", "displayOrder"])
    .index("by_type", ["messageType"])
    .index("by_creator", ["createdBy"]),

  userCustomMessages: defineTable({
    userId: v.id("users"),
    lessonId: v.id("lessons"),
    content: v.string(),
    createdAt: v.number(),
    lastModified: v.number(),
  })
    .index("by_user_lesson", ["userId", "lessonId"])
    .index("by_lesson", ["lessonId"])
    .index("by_user", ["userId"]),

  userSelectedMessages: defineTable({
    userId: v.id("users"),
    predefinedMessageId: v.optional(v.id("predefinedMessages")),
    customMessageId: v.optional(v.id("userCustomMessages")),
    lessonId: v.id("lessons"),
    scheduledAt: v.optional(v.number()),
    isScheduled: v.boolean(),
    createdAt: v.number(),
    // Delivery tracking fields
    deliveryStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("sent"), 
      v.literal("failed"),
      v.literal("cancelled")
    )),
    deliveryAttempts: v.optional(v.number()),
    lastDeliveryAttempt: v.optional(v.number()),
    deliveryError: v.optional(v.string()),
    actualDeliveryTime: v.optional(v.number()),
  })
    .index("by_user_lesson", ["userId", "lessonId"])
    .index("by_user_scheduled", ["userId", "isScheduled"])
    .index("by_lesson", ["lessonId"])
    .index("by_scheduled_time", ["scheduledAt"])
    .index("by_delivery_status", ["deliveryStatus"]),
};

// Extended users table to add isAdmin field (overrides authTables.users)
const extendedUsersTable = defineTable({
  name: v.optional(v.string()),
  image: v.optional(v.string()),
  email: v.optional(v.string()),
  emailVerificationTime: v.optional(v.number()),
  phone: v.optional(v.string()),
  phoneVerificationTime: v.optional(v.number()),
  isAnonymous: v.optional(v.boolean()),
  // New field for admin functionality
  isAdmin: v.optional(v.boolean()),
  // New field for Apple Shortcut verification
  isVerified: v.optional(v.boolean()),
})
  .index("email", ["email"])
  .index("phone", ["phone"]);

export default defineSchema({
  ...authTables,
  ...applicationTables,
  // Override the users table from authTables
  users: extendedUsersTable,
});
