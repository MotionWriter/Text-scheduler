# Database Schema Documentation

## Overview

The MBS database schema is designed around a multi-tenant architecture where users can manage their own contacts, groups, templates, and messages. All core entities are user-scoped for data isolation and security.

## Core Tables

### Users (`users`)
Central user management table storing user account information.

**Fields:**
- `_id`: Unique user identifier
- `_creationTime`: Account creation timestamp
- `email`: User's email address (optional)
- `isAnonymous`: Flag for anonymous user accounts (optional)

**Purpose:** Foundation table for user authentication and account management.

### Contacts (`contacts`)
Stores contact information for each user's address book.

**Fields:**
- `_id`: Unique contact identifier
- `userId`: Reference to owning user
- `name`: Contact's display name (required)
- `phoneNumber`: Primary phone number (required)
- `email`: Email address (optional)
- `notes`: Additional notes about the contact (optional)
- `_creationTime`: Creation timestamp

**Purpose:** Core contact management with flexible data storage for various contact types.

### Groups (`groups`)  
Organizational containers for grouping contacts together.

**Fields:**
- `_id`: Unique group identifier
- `userId`: Reference to owning user
- `name`: Group display name (required)
- `description`: Group description/purpose (required)
- `color`: Visual identification color (required)
- `_creationTime`: Creation timestamp

**Purpose:** Enables contact organization and group-based messaging operations.

### Group Memberships (`groupMemberships`)
Junction table linking contacts to groups in many-to-many relationship.

**Fields:**
- `_id`: Unique membership record identifier
- `userId`: Reference to owning user (for data isolation)
- `groupId`: Reference to the group
- `contactId`: Reference to the contact
- `_creationTime`: Membership creation timestamp

**Purpose:** Manages contact-group relationships enabling flexible group compositions.

## Messaging System

### Message Templates (`messageTemplates`)
Reusable message templates for common communications.

**Fields:**
- `_id`: Unique template identifier
- `userId`: Reference to owning user
- `name`: Template display name (required)
- `content`: Template message content (required)
- `category`: Optional categorization tag
- `_creationTime`: Creation timestamp

**Purpose:** Streamlines message creation with reusable, categorized templates.

### Scheduled Messages (`scheduledMessages`)
Messages scheduled for future delivery with tracking capabilities.

**Fields:**
- `_id`: Unique scheduled message identifier
- `userId`: Reference to owning user
- `contactId`: Target contact for the message
- `message`: Message content to be sent (required)
- `scheduledFor`: Timestamp for when message should be sent
- `status`: Current status (pending/sent/failed/etc.)
- `templateId`: Optional reference to source template
- `category`: Optional message categorization
- `_creationTime`: Creation timestamp

**Purpose:** Handles message scheduling, delivery tracking, and template integration.

## Study Book System

### Study Books (`studyBooks`)
Study book management for structured content delivery.

**Fields:**
- `_id`: Unique study book identifier
- `title`: Book title (required)
- `description`: Book description (required)
- `totalLessons`: Number of lessons in the book (required)
- `createdBy`: Reference to admin user who created it (required)
- `createdAt`: Creation timestamp (required)
- `isActive`: Active/inactive status flag (required)

**Purpose:** Manages study book library with admin controls for content management.

### Lessons (`lessons`)
Individual lessons within study books.

**Fields:**
- `_id`: Unique lesson identifier
- `studyBookId`: Reference to parent study book (required)
- `lessonNumber`: Sequential lesson number within book (required)
- `title`: Lesson title (required)
- `description`: Lesson description (required)
- `createdAt`: Creation timestamp (required)
- `isActive`: Active/inactive status flag (required)

**Purpose:** Structures study content into discrete lessons with ordered progression.

### Predefined Messages (`predefinedMessages`)
Admin-created message templates for lessons.

**Fields:**
- `_id`: Unique message identifier
- `lessonId`: Reference to associated lesson (required)
- `content`: Message content text (required)
- `messageType`: Type classification (reminder/scripture/custom) (required)
- `displayOrder`: Ordering for message selection UI (required)
- `createdBy`: Reference to admin user who created it (required)
- `createdAt`: Creation timestamp (required)
- `isActive`: Active/inactive status flag (required)

**Purpose:** Provides pre-written message options for each lesson with type categorization.

### User Custom Messages (`userCustomMessages`)
User-created personalized messages for lessons.

**Fields:**
- `_id`: Unique message identifier
- `userId`: Reference to message author (required)
- `lessonId`: Reference to associated lesson (required)
- `content`: Custom message content (required)
- `createdAt`: Creation timestamp (required)
- `lastModified`: Last edit timestamp (required)

**Purpose:** Enables users to create personalized messages for study lessons.

### User Selected Messages (`userSelectedMessages`)
User message selections with delivery tracking.

**Fields:**
- `_id`: Unique selection identifier
- `userId`: Reference to user making selection (required)
- `lessonId`: Reference to associated lesson (required)
- `predefinedMessageId`: Reference to predefined message (optional)
- `customMessageId`: Reference to custom message (optional)
- `scheduledAt`: Scheduled delivery timestamp (optional)
- `isScheduled`: Scheduling status flag (optional)
- `createdAt`: Selection creation timestamp (required)
- `deliveryStatus`: Current delivery status (pending/sent/failed/cancelled) (optional)
- `deliveryAttempts`: Number of delivery attempts (optional)
- `lastDeliveryAttempt`: Last attempt timestamp (optional)
- `deliveryError`: Error message from failed delivery (optional)
- `actualDeliveryTime`: Successful delivery timestamp (optional)

**Purpose:** Tracks user message selections and comprehensive delivery status with retry capabilities.

## Authentication System

### Auth Sessions (`authSessions`)
Active user session management for authenticated users.

**Fields:**
- `_id`: Unique session identifier
- `userId`: Reference to authenticated user
- `expirationTime`: Session expiration timestamp
- `_creationTime`: Session start timestamp

### Auth Refresh Tokens (`authRefreshTokens`)
Refresh token management for session renewal.

**Fields:**
- `_id`: Unique refresh token identifier
- `sessionId`: Reference to associated session
- `expirationTime`: Token expiration timestamp
- `firstUsedTime`: First usage timestamp (optional)
- `parentRefreshTokenId`: Reference to parent token for rotation (optional)
- `_creationTime`: Token creation timestamp

### Auth Accounts (`authAccounts`)
External authentication provider account linkages.

**Fields:**
- `_id`: Unique account link identifier
- `userId`: Reference to local user account
- `provider`: Authentication provider name
- `providerAccountId`: Provider's account identifier
- `secret`: Provider-specific secret data (optional)
- `_creationTime`: Link creation timestamp

## API Management

### API Keys (`apiKeys`)
Programmatic API access management for users.

**Fields:**
- `_id`: Unique API key identifier
- `userId`: Reference to owning user
- `name`: Human-readable key name
- `keyHash`: Hashed API key for secure storage
- `isActive`: Active/inactive status flag
- `_creationTime`: Key creation timestamp

**Purpose:** Enables secure programmatic access to user's data and messaging capabilities.

## Schema Design Principles

1. **User Data Isolation**: All user data is scoped by userId for security
2. **Flexible Relationships**: Many-to-many relationships support complex organizational needs
3. **Audit Trails**: Creation timestamps on all entities for tracking
4. **Optional Fields**: Flexible schemas accommodate various use cases
5. **Status Tracking**: Status fields enable workflow management
6. **Security**: Hashed credentials and proper foreign key relationships
7. **Delivery Tracking**: Comprehensive status tracking for message delivery lifecycle
8. **Admin Controls**: Admin-managed content with user participation tracking
9. **Retry Logic**: Built-in retry mechanisms with attempt counting and error logging

## Indexes and Performance

### Database Indexes
- `by_user`: User-scoped queries for data isolation
- `by_scheduled_time`: Efficient scheduled message processing
- `by_delivery_status`: Delivery status filtering and reporting
- `by_lesson`: Lesson-based content queries
- `by_study_book`: Study book organization

### Query Patterns
- **User-scoped queries**: All data access filtered by userId
- **Time-based scheduling**: Efficient lookup of messages due for delivery
- **Status-based filtering**: Quick access to messages by delivery status
- **Hierarchical content**: Study book → lessons → messages relationship queries
- **Real-time updates**: Convex subscriptions for live status updates