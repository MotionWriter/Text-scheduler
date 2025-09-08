# MBS Quick Overview

## What is MBS?
Message Broadcasting System - A Convex-based platform for managing contacts, creating message templates, and scheduling bulk communications.

## Core Components

### Database Tables
- **users** - User accounts and authentication
- **contacts** - Phone numbers, emails, names, notes (user-scoped)
- **groups** - Named contact collections with colors (user-scoped)
- **groupMemberships** - Links contacts to groups (many-to-many)
- **messageTemplates** - Reusable message content (user-scoped)
- **scheduledMessages** - Messages queued for future delivery (user-scoped)
- **apiKeys** - Programmatic access keys (user-scoped)
- **auth*** - Session/token management tables

### Key Relationships
```
User -> Contacts -> Groups (via groupMemberships)
User -> Templates -> Scheduled Messages
User -> API Keys (for external access)
```

## Primary Workflows

1. **Contact Management**: Add contacts → Organize into groups → Tag with colors/descriptions
2. **Message Creation**: Create templates → Schedule messages to contacts/groups → Track delivery status
3. **API Access**: Generate API keys → Access user data programmatically → Integrate with external systems

## Architecture
- **Backend**: Convex (serverless, real-time database)
- **Auth**: Multi-provider with sessions and refresh tokens
- **Data**: NoSQL documents, user-scoped, no formal schema
- **API**: Auto-generated from Convex functions

## File Structure
```
MBS/
├── convex/_generated/    # Auto-generated APIs and types
├── Documentation/        # This documentation
├── package.json         # Dependencies (just Convex)
└── .env.local          # Deployment config
```

## Current State
- Schemaless database (flexible but less type-safe)
- No frontend UI (backend-only)
- No Convex functions implemented yet
- Authentication infrastructure ready
- Tables populated with real data

## Use Cases
- Small business customer communication
- Event notifications and reminders  
- Marketing campaign management
- Personal group messaging
- Automated appointment reminders