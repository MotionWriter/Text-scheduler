# MBS - Message Broadcasting System

## Overview

MBS (Message Broadcasting System) is a comprehensive messaging platform built on Convex that enables users to manage contacts, create message templates, organize groups, and schedule message delivery. The system provides a complete solution for mass communication with advanced user management and authentication capabilities.

## Architecture

The application is built using:
- **Backend**: Convex (serverless backend with real-time database)
- **Database**: Convex's built-in database with real-time synchronization
- **Authentication**: Convex Auth with support for multiple providers
- **API Management**: Built-in API key system for programmatic access

## Core Purpose

MBS serves as a centralized platform for:
1. **Contact Management** - Store and organize contact information
2. **Group Organization** - Create and manage contact groups with categorization
3. **Message Templates** - Create reusable message templates for common communications
4. **Message Scheduling** - Schedule messages for future delivery
5. **User Management** - Multi-user support with authentication and session management
6. **API Access** - Programmatic access via API keys for integration

## Key Features

### User Management & Authentication
- User registration and authentication
- Session management with refresh tokens
- Support for multiple authentication providers
- API key generation for programmatic access

### Contact Management
- Store contact details (name, phone, email, notes)
- Associate contacts with specific users
- Search and organize contacts efficiently

### Group Management  
- Create named groups with descriptions
- Color-coded group organization
- Add/remove contacts from groups
- Group-based messaging capabilities

### Message Templates
- Create reusable message templates
- Categorize templates for easy organization
- Template-based message composition

### Message Scheduling
- Schedule messages for future delivery
- Track message status (pending, sent, failed)
- Template integration for scheduled messages
- Bulk messaging to groups or individual contacts

## Target Use Cases

- **Small Businesses**: Customer communication, appointment reminders, promotional messages
- **Organizations**: Event notifications, member communications, announcements  
- **Personal Use**: Family/friend group messaging, reminder systems
- **Marketing**: Campaign management, customer outreach, automated follow-ups