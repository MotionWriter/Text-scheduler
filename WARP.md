# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start both frontend (Vite) and backend (Convex) servers in parallel
- `npm run dev:frontend` - Start only the frontend development server
- `npm run dev:backend` - Start only the Convex backend development server
- `npm run build` - Build the frontend for production
- `npm run lint` - Run full TypeScript compilation checks for both frontend and backend

### Convex-Specific Commands
- `npx convex dev` - Start Convex development server with live schema updates
- `npx convex deploy` - Deploy functions and schema to production
- `npx convex dashboard` - Open the Convex dashboard for this deployment

## Architecture Overview

### Technology Stack
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Convex (serverless functions with real-time database)
- **Authentication**: Convex Auth with Password and Anonymous providers
- **UI Components**: Radix UI primitives with custom styling
- **State Management**: Convex queries/mutations (no additional state management needed)

### High-Level Architecture

This is a **message scheduling application for men's study groups** with two primary user types:
- **Admins**: Create and manage study book content, monitor message delivery
- **Regular Users**: Select and schedule study messages from predefined content

#### Core System Components

1. **Study Book System** (`studyBooks` → `lessons` → `predefinedMessages`)
   - Hierarchical content structure: Study Books contain Lessons, Lessons contain Messages
   - Admins create study books and lessons with predefined messages
   - Users select from predefined messages or create custom messages

2. **Message Scheduling System** (`userSelectedMessages` table)
   - Users select messages from lessons and schedule them for delivery
   - Automatic scheduling based on lesson timing configuration
   - Delivery status tracking with retry logic

3. **Message Delivery Infrastructure**
   - **Cron Jobs** (`messageScheduler.ts`): Process scheduled messages every minute
   - **HTTP API** (`router.ts`): External endpoints for message delivery services
   - **Delivery Tracking**: Status management (pending/sent/failed/cancelled)

4. **Legacy Contact Management** (for backwards compatibility)
   - `contacts`, `groups`, `messageTemplates`, `scheduledMessages` tables
   - Traditional message scheduling workflow

### Data Architecture

#### Primary Tables (Study Book System)
- `studyBooks`: Top-level study content containers
- `lessons`: Individual lessons within study books 
- `predefinedMessages`: Admin-created message templates for each lesson
- `userSelectedMessages`: User's scheduled messages with delivery tracking
- `userCustomMessages`: User-created custom messages for lessons

#### User Management
- `users`: Extended auth table with `isAdmin` field for role-based access
- `apiKeys`: API authentication for external message delivery services

#### Legacy Tables (maintained for compatibility)
- `contacts`, `groups`, `groupMemberships`: Contact management
- `messageTemplates`, `scheduledMessages`: Traditional message scheduling

### Key Business Logic

1. **Message Selection Flow**:
   - Users browse active study books and lessons
   - Select from predefined messages or create custom messages
   - Schedule messages based on lesson timing (activeWeekStart + defaultSendTime)

2. **Automatic Message Processing**:
   - Cron job runs every minute to find messages due for delivery
   - Messages transition through status: undefined → pending → sent/failed
   - Automatic retry logic for failed messages (max 3 attempts)

3. **External API Integration**:
   - HTTP endpoints in `router.ts` support external SMS/messaging services
   - API key authentication for secure external access
   - Endpoints for fetching pending messages and updating delivery status

### File Organization

#### Backend (`convex/`)
- `schema.ts`: Complete database schema definition
- `auth.ts`: Authentication setup and user queries
- `messageScheduler.ts`: Cron jobs for message processing
- `router.ts`: HTTP API endpoints for external services
- `smsDelivery.ts`: Message delivery logic
- Individual table modules: `contacts.ts`, `groups.ts`, `lessons.ts`, etc.

#### Frontend (`src/`)
- `App.tsx`: Main app with authentication wrapper
- `Dashboard.tsx`: Main UI with tab-based navigation and admin/test mode toggle
- `components/`: Tab components for each functional area
  - `StudyMessagesTab.tsx`: Core user interface for study message selection
  - `LessonContentTab.tsx`: Admin interface for managing study content
  - `DeliveryManagementTab.tsx`: Admin interface for monitoring message delivery

## Important Development Notes

### Convex-Specific Patterns
- Follow the Convex rules in `.cursor/rules/convex_rules.mdc` strictly
- Always use new function syntax with validators
- Use `internal` functions for system operations not exposed to frontend
- Database operations must use proper indexes (defined in schema)

### Admin vs Regular User Features
- Admin mode toggle in Dashboard controls available tabs
- Test mode allows admins to experience the regular user workflow
- Check `user?.isAdmin` for role-based feature access

### Message Delivery Architecture
- Messages are processed asynchronously via cron jobs
- External delivery services integrate via HTTP API
- Status tracking enables monitoring and retry logic
- Failed messages are automatically retried with backoff

### Authentication & API Keys
- Users can generate API keys for external service integration
- API key validation happens in `apiAuth.ts`
- Anonymous and Password authentication supported

## Testing Considerations

- Use Test Mode toggle for admins to test user workflows
- Message delivery can be tested via the HTTP API endpoints
- Cron jobs run automatically in development but can be manually triggered
- Database operations are real-time and immediately reflected in UI

## Deployment

- Connected to Convex deployment `scrupulous-wren-82`
- Frontend builds to static files via Vite
- Backend functions deploy automatically via `convex deploy`
- Environment variables and secrets managed through Convex dashboard
