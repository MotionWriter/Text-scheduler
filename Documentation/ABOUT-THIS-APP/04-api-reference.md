# API Reference

## Overview

The MBS API is built on Convex, providing real-time database operations through queries and mutations. The system uses Convex's built-in function system with auto-generated APIs and TypeScript types.

## Authentication

### API Key Authentication
Users can generate API keys for programmatic access to their data. All API operations are scoped to the authenticated user's data.

**API Key Generation Process:**
1. User creates named API key through application
2. System generates and hashes the key
3. Key hash stored in `apiKeys` table
4. Raw key provided to user (not stored)

**API Key Usage:**
- Include API key in request headers or parameters
- All operations limited to key owner's data
- Keys can be activated/deactivated as needed

## Data Access Patterns

### User-Scoped Operations
All data operations are automatically scoped to the authenticated user:
```typescript
// All queries automatically filter by userId
const userContacts = await db.query("contacts")
  .filter(q => q.eq(q.field("userId"), userId))
  .collect();
```

### Real-Time Subscriptions
Convex provides real-time updates for all data changes:
```typescript
// Frontend automatically receives updates when data changes
const contacts = useQuery(api.contacts.list);
```

## Core Entities

### Users
**Table**: `users`
**Purpose**: User account management and authentication

**Fields:**
- `_id`: User ID (auto-generated)
- `email`: User email address (optional)
- `isAnonymous`: Anonymous user flag (optional)
- `_creationTime`: Account creation timestamp

### Contacts  
**Table**: `contacts`
**Purpose**: Contact information storage and management

**Fields:**
- `_id`: Contact ID (auto-generated)
- `userId`: Owning user reference
- `name`: Contact name (required)
- `phoneNumber`: Primary phone number (required)
- `email`: Email address (optional)
- `notes`: Additional notes (optional)
- `_creationTime`: Creation timestamp

**Common Operations:**
- List all user contacts
- Create new contact
- Update contact information
- Delete contact
- Search contacts by name/phone/email

### Groups
**Table**: `groups`  
**Purpose**: Contact organization and group management

**Fields:**
- `_id`: Group ID (auto-generated)
- `userId`: Owning user reference
- `name`: Group name (required)
- `description`: Group description (required)
- `color`: Visual identifier color (required)
- `_creationTime`: Creation timestamp

**Common Operations:**
- List user groups
- Create new group
- Update group details
- Delete group
- Get group membership count

### Group Memberships
**Table**: `groupMemberships`
**Purpose**: Contact-to-group relationship management

**Fields:**
- `_id`: Membership ID (auto-generated)  
- `userId`: Data isolation field
- `groupId`: Group reference
- `contactId`: Contact reference
- `_creationTime`: Membership creation timestamp

**Common Operations:**
- Add contact to group
- Remove contact from group
- List group members
- List contact group memberships
- Bulk group operations

### Message Templates
**Table**: `messageTemplates`
**Purpose**: Reusable message template storage

**Fields:**
- `_id`: Template ID (auto-generated)
- `userId`: Owning user reference
- `name`: Template name (required)
- `content`: Message content (required)
- `category`: Optional categorization
- `_creationTime`: Creation timestamp

**Common Operations:**
- List user templates
- Create new template
- Update template content
- Delete template  
- Filter templates by category

### Scheduled Messages
**Table**: `scheduledMessages`
**Purpose**: Message scheduling and delivery tracking

**Fields:**
- `_id`: Message ID (auto-generated)
- `userId`: Owning user reference
- `contactId`: Target contact reference
- `message`: Message content (required)
- `scheduledFor`: Delivery timestamp
- `status`: Current status (required)
- `templateId`: Source template reference (optional)
- `category`: Message category (optional)
- `_creationTime`: Creation timestamp

**Status Values:**
- `"pending"`: Scheduled, awaiting delivery
- `"sent"`: Successfully delivered
- `"failed"`: Delivery failed
- `"cancelled"`: User cancelled message

**Common Operations:**
- Schedule new message
- Update scheduled message
- Cancel scheduled message
- List pending messages
- Query messages by status
- Get delivery statistics

## Function Types

### Queries (Read Operations)
Convex queries provide real-time, reactive data access:
```typescript
// Example query structure
export const listContacts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    return await ctx.db
      .query("contacts")
      .filter(q => q.eq(q.field("userId"), userId))
      .collect();
  },
});
```

### Mutations (Write Operations)  
Convex mutations handle data modifications:
```typescript
// Example mutation structure
export const createContact = mutation({
  args: {
    name: v.string(),
    phoneNumber: v.string(),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    return await ctx.db.insert("contacts", {
      userId,
      ...args,
    });
  },
});
```

### Actions (External Operations)
Convex actions handle external API calls and complex operations:
```typescript
// Example action for message delivery
export const deliverMessage = action({
  args: { messageId: v.id("scheduledMessages") },
  handler: async (ctx, args) => {
    // Fetch message details
    // Call external SMS/email service
    // Update message status
  },
});
```

## Error Handling

### Common Error Scenarios
- **Permission Denied**: User attempting to access another user's data
- **Not Found**: Requesting non-existent document
- **Validation Error**: Invalid input parameters
- **Rate Limiting**: Too many requests in time window

### Error Response Format
```typescript
{
  error: "PERMISSION_DENIED",
  message: "Cannot access resource not owned by user",
  details: { /* additional context */ }
}
```

## Rate Limiting

The system includes rate limiting infrastructure:
- `authRateLimits` table for tracking usage
- Per-user and per-API-key limits
- Configurable limits by operation type
- Graceful degradation when limits exceeded

## Best Practices

### Data Access
- Always verify user ownership before operations
- Use appropriate indexes for query performance
- Implement proper error handling
- Validate input parameters

### Security
- Never expose other users' data
- Validate all inputs before database operations
- Use secure API key storage and transmission
- Implement proper session management

### Performance
- Use efficient query patterns
- Implement pagination for large data sets
- Consider caching for frequently accessed data
- Monitor function execution times

### Development
- Follow consistent naming conventions
- Document complex query logic
- Test error scenarios thoroughly  
- Use TypeScript for type safety

## HTTP API Endpoints

### Study Message Delivery System
The application provides HTTP API endpoints for external testing services and delivery integrations.

**Authentication**: All endpoints require API key authentication via `Authorization: Bearer <api-key>` header.

#### GET `/api/study-messages/pending`
Retrieve pending study messages ready for delivery.

**Query Parameters:**
- `limit` (optional): Maximum number of messages to return (default: 50, max: 1000)

**Response:**
```json
{
  "messages": [
    {
      "id": "message_id",
      "userId": "user_id", 
      "messageContent": "Message content text",
      "messageType": "reminder|scripture|custom",
      "lessonTitle": "Lesson title",
      "scheduledAt": 1640995200000,
      "deliveryAttempts": 0,
      "user": {
        "name": "User Name",
        "phone": "+1234567890", 
        "email": "user@example.com"
      }
    }
  ],
  "timestamp": 1640995200000,
  "count": 5
}
```

#### POST `/api/study-messages/delivered`
Mark a study message as successfully delivered.

**Request Body:**
```json
{
  "messageId": "message_id",
  "deliveredAt": 1640995200000,
  "externalMessageId": "external_service_id" // optional
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "message_id",
  "deliveredAt": 1640995200000
}
```

#### POST `/api/study-messages/failed`
Mark a study message as failed delivery.

**Request Body:**
```json
{
  "messageId": "message_id",
  "error": "Delivery failure reason", // optional
  "failedAt": 1640995200000 // optional, defaults to now
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "message_id",
  "error": "Delivery failure reason"
}
```

#### GET `/api/study-messages/stats`
Get delivery statistics and metrics.

**Query Parameters:**
- `timeRange` (optional): Time range in hours (default: 24)

**Response:**
```json
{
  "pending": 5,
  "sent": 42,
  "failed": 3,
  "total": 50,
  "successRate": 84.0,
  "timestamp": 1640995200000
}
```

## Integration Examples

### Creating a Contact
```typescript
const newContact = await convex.mutation(api.contacts.create, {
  name: "John Doe",
  phoneNumber: "+1234567890",
  email: "john@example.com",
  notes: "Met at conference"
});
```

### Scheduling a Message
```typescript
const scheduledMessage = await convex.mutation(api.messages.schedule, {
  contactId: contactId,
  message: "Reminder: Your appointment is tomorrow at 2 PM",
  scheduledFor: tomorrowTimestamp,
  category: "appointment_reminder"
});
```

### Querying Group Members
```typescript
const groupMembers = await convex.query(api.groups.getMembers, {
  groupId: selectedGroupId
});
```

### External Service Integration
```typescript
// Fetch pending messages for delivery
const response = await fetch('/api/study-messages/pending?limit=10', {
  headers: {
    'Authorization': 'Bearer your_api_key_here'
  }
});
const { messages } = await response.json();

// Process messages through your delivery service
for (const message of messages) {
  try {
    await yourDeliveryService.send(message.user.phone, message.messageContent);
    
    // Mark as delivered
    await fetch('/api/study-messages/delivered', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer your_api_key_here',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messageId: message.id,
        deliveredAt: Date.now()
      })
    });
  } catch (error) {
    // Mark as failed
    await fetch('/api/study-messages/failed', {
      method: 'POST', 
      headers: {
        'Authorization': 'Bearer your_api_key_here',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messageId: message.id,
        error: error.message,
        failedAt: Date.now()
      })
    });
  }
}
```