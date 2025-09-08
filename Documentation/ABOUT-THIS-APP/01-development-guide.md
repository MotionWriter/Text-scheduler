# Development Guide

## Project Structure

### Core Architecture
```
MBS/
├── convex/                 # Convex backend functions and schema
│   └── _generated/        # Auto-generated API and type definitions
├── Documentation/         # Project documentation
├── package.json          # Project dependencies and scripts
├── .env.local           # Environment configuration
└── .gitignore           # Git ignore rules
```

### Technology Stack

**Backend Framework**: Convex
- Serverless backend with real-time database
- Built-in authentication system
- Auto-generated APIs and TypeScript types
- Real-time synchronization across clients

**Database**: Convex Database
- NoSQL document-based storage
- Real-time queries and mutations
- Built-in indexing and search capabilities
- Automatic schema inference

**Authentication**: Convex Auth
- Multi-provider authentication support
- Session management with refresh tokens
- Built-in security best practices

## Development Setup

### Prerequisites
- Node.js (v16 or later)
- npm or yarn package manager
- Convex CLI (`npm install -g convex`)

### Environment Configuration
The application uses environment variables stored in `.env.local`:
```
CONVEX_DEPLOYMENT=dev:scrupulous-wren-82
CONVEX_URL=https://scrupulous-wren-82.convex.cloud
```

### Database Schema
The application currently uses **schemaless mode**, allowing for flexible data structures without rigid schema definitions. This is evidenced by the generated `dataModel.d.ts` file showing permissive types.

**Current State**: No `schema.ts` file exists
**Implication**: All document types are `any`, providing maximum flexibility but less type safety
**Future Enhancement**: Consider adding a schema file for better type safety and validation

## Data Model Patterns

### User-Scoped Data
All user data follows a consistent pattern where each document includes a `userId` field:
```typescript
interface UserScopedDocument {
  _id: Id<string>;
  _creationTime: number;
  userId: Id<"users">;
  // ... other fields
}
```

### Many-to-Many Relationships
The application implements many-to-many relationships through junction tables:
- `groupMemberships` links `contacts` and `groups`
- Each junction record includes `userId` for data isolation

### Status Tracking
Messages use status strings to track their lifecycle:
- `"pending"` - Scheduled but not yet sent
- `"sent"` - Successfully delivered
- `"failed"` - Delivery failed
- Custom status values as needed

## Development Workflows

### Adding New Features

1. **Database Changes**
   - Define new document structures
   - Consider user-scoping requirements
   - Plan relationship patterns
   - Add appropriate indexes if needed

2. **Backend Functions**
   - Create Convex queries for data retrieval
   - Implement mutations for data modification
   - Add validation logic
   - Consider permission checks

3. **Type Safety**
   - Update generated types with `npx convex dev`
   - Consider adding schema definitions
   - Maintain consistent interfaces

### Authentication Integration

The application uses Convex Auth with the following tables:
- `authSessions` - Active user sessions
- `authRefreshTokens` - Token refresh management  
- `authAccounts` - Provider account linkages
- `authRateLimits` - Rate limiting (currently unused)
- `authVerificationCodes` - Email/phone verification (currently unused)
- `authVerifiers` - Additional verification methods (currently unused)

### API Key Management

Users can generate API keys for programmatic access:
- Keys are hashed before storage (`keyHash` field)
- Each key has a human-readable `name`
- Keys can be activated/deactivated via `isActive` flag
- All API operations are user-scoped

## Deployment Considerations

### Environment Management
- Development deployment: `dev:scrupulous-wren-82`
- Production deployment: Configure separate environment
- Environment-specific URLs and configuration

### Data Migration
- Schema changes require careful migration planning
- User data must remain isolated during migrations
- Consider backwards compatibility for API consumers

### Security Considerations
- All user data is properly scoped and isolated
- API keys are securely hashed
- Authentication handles session management securely
- No sensitive data should be logged or exposed

## Monitoring and Maintenance

### Performance Monitoring
- Monitor Convex function execution times
- Track database query performance
- Watch for bottlenecks in real-time synchronization

### Data Integrity
- Regular checks for orphaned records
- Validation of user-scoped data consistency
- Monitoring of message delivery success rates

### Scaling Considerations
- User growth impacts on database performance
- Message volume handling capabilities
- Real-time synchronization at scale

## Future Development Opportunities

### Schema Implementation
- Add formal schema definitions for better type safety
- Implement validation rules at the database level
- Improve development experience with strict typing

### Feature Enhancements
- Message delivery providers integration
- Advanced scheduling options (recurring messages)
- Analytics and reporting features
- Group messaging optimization
- File attachment support
- Message threading and conversations

### API Improvements
- REST API endpoint exposure
- Webhook system for external integrations
- Bulk operation APIs
- Advanced filtering and search capabilities