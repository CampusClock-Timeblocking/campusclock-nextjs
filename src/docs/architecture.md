# CampusClock Architecture Documentation

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Project Structure](#project-structure)
5. [Database Schema](#database-schema)
6. [API Architecture](#api-architecture)
7. [Scheduling System](#scheduling-system)
8. [Authentication & Authorization](#authentication--authorization)
9. [Frontend Architecture](#frontend-architecture)
10. [External Services](#external-services)
11. [Development Workflow](#development-workflow)

---

## Overview

**CampusClock** is an intelligent task scheduling and calendar management
application built on the T3 Stack. The application helps users optimize their
time by automatically scheduling tasks based on their preferences, energy
levels, calendar availability, and task priorities using a constraint-based
optimization solver.

### Key Features

- **Intelligent Task Scheduling**: Automatically schedules tasks using
  constraint optimization
- **Calendar Integration**: Syncs with Google Calendar for busy slot detection
- **Habit Tracking**: Recurring tasks with flexible recurrence patterns
- **Project Management**: Hierarchical project structure with sub-projects
- **Energy-Aware Scheduling**: Matches task complexity with user's energy
  profile
- **Working Preferences**: Configurable working hours, breaks, and availability
- **Event Calendar**: Visual calendar interface with drag-and-drop support

---

## Technology Stack

### Core Framework

- **Next.js 15.2.3** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5.8** - Type-safe JavaScript

### Backend & API

- **tRPC 11** - End-to-end typesafe APIs
- **Prisma 6.17** - Type-safe ORM
- **PostgreSQL** - Primary database
- **Better Auth 1.3** - Authentication framework

### State Management & Data Fetching

- **TanStack Query (React Query) 5.69** - Server state management
- **Zustand 5.0** - Client state management

### UI & Styling

- **Tailwind CSS 4.0** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **shadcn/ui** - Component library built on Radix UI
- **Framer Motion 12.23** - Animation library
- **Lucide React** - Icon library

### Scheduling & Optimization

- **OR-Tools CP-SAT** - Constraint programming solver (Python microservice)
- **FastAPI** - Python API framework for solver service

### External Integrations

- **Google Calendar API** - Calendar synchronization
- **OpenAI API** - AI-powered field inference (optional)
- **Upstash Redis** - Caching and session storage

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Turbo** - Build system optimization

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│  Next.js App Router │ React Components │ TanStack Query     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ tRPC (HTTP/JSON)
                     │
┌────────────────────▼────────────────────────────────────────┐
│                    Server Layer                             │
│  tRPC Routers │ Services │ Business Logic                   │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
┌────────▼───┐ ┌─────▼─────┐ ┌──▼──────────────┐
│  Prisma    │ │  Better   │ │  Solver Service │
│  (Postgres)│ │   Auth    │ │   (Python)      │
└────────────┘ └───────────┘ └─────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
┌────────▼───┐ ┌─────▼─────┐ ┌──▼──────────────┐
│  Google    │ │  OpenAI   │ │  Upstash Redis  │
│  Calendar  │ │    API    │ │     (Cache)     │
└────────────┘ └───────────┘ └─────────────────┘
```

### Architecture Patterns

1. **Layered Architecture**
   - **Presentation Layer**: React components and pages
   - **API Layer**: tRPC routers and procedures
   - **Service Layer**: Business logic and orchestration
   - **Data Layer**: Prisma ORM and database

2. **Microservices Pattern**
   - Main Next.js application
   - Separate Python-based solver service for constraint optimization

3. **Type Safety**
   - End-to-end type safety with tRPC
   - Shared types between client and server
   - Zod schemas for runtime validation

---

## Project Structure

```
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (app)/                    # Protected app routes
│   │   │   ├── dashboard/            # Dashboard page
│   │   │   ├── activities/           # Activities view
│   │   │   ├── account/              # Account settings
│   │   │   └── layout.tsx            # App layout with sidebar
│   │   ├── api/                      # API routes
│   │   │   ├── auth/[...all]/        # Better Auth catch-all
│   │   │   ├── trpc/[trpc]/          # tRPC endpoint
│   │   │   └── cache/purge/          # Cache invalidation
│   │   ├── auth/[path]/              # Auth pages
│   │   ├── onboarding/               # Onboarding flow
│   │   ├── settings/                 # Settings pages
│   │   ├── layout.tsx                # Root layout
│   │   └── providers.tsx             # Global providers
│   │
│   ├── components/                   # React components
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── basic-components/         # Reusable UI components
│   │   ├── event-calendar/           # Calendar components
│   │   ├── datatable/                # Data table components
│   │   ├── item-dialogs/             # Task/project/habit dialogs
│   │   └── ...
│   │
│   ├── server/                       # Server-side code
│   │   ├── api/
│   │   │   ├── routers/              # tRPC routers
│   │   │   │   ├── tasks.ts
│   │   │   │   ├── projects.ts
│   │   │   │   ├── habits.ts
│   │   │   │   ├── calendar.ts
│   │   │   │   ├── scheduler.ts
│   │   │   │   └── onboarding.ts
│   │   │   ├── services/              # Business logic services
│   │   │   │   ├── scheduler-service.ts
│   │   │   │   ├── calendar-service.ts
│   │   │   │   ├── event-service.ts
│   │   │   │   ├── preferences-service.ts
│   │   │   │   ├── ai-infer-service.ts
│   │   │   │   └── cache-service.ts
│   │   │   ├── root.ts                # Root router
│   │   │   └── trpc.ts                # tRPC setup
│   │   │
│   │   ├── lib/
│   │   │   ├── scheduler/             # Scheduling logic
│   │   │   │   ├── scheduler.ts       # Main scheduler
│   │   │   │   ├── solver-client.ts   # Solver HTTP client
│   │   │   │   ├── prisma-adapters.ts # DB adapters
│   │   │   │   └── types.ts           # Type definitions
│   │   │   ├── solver_service/        # Python solver microservice
│   │   │   │   ├── solver.py          # OR-Tools wrapper
│   │   │   │   ├── models.py          # Pydantic models
│   │   │   │   ├── main.py            # FastAPI app
│   │   │   │   └── Dockerfile         # Container config
│   │   │   ├── auth.ts                # Better Auth config
│   │   │   └── openai.ts              # OpenAI client
│   │   │
│   │   └── db.ts                      # Prisma client
│   │
│   ├── trpc/                          # tRPC client setup
│   ├── hooks/                         # React hooks
│   ├── lib/                           # Shared utilities
│   └── styles/                        # Global styles
│
├── prisma/
│   ├── schema.prisma                  # Database schema
│   └── migrations/                    # Migration history
│
├── public/                            # Static assets
└── [config files]                     # Next.js, TypeScript, etc.
```

---

## Database Schema

### Core Models

#### User & Authentication

- **User**: Core user entity with email, name, and profile
- **Session**: User sessions with token and expiration
- **Account**: OAuth account connections (Google)
- **Verification**: Email verification tokens

#### Task Management

- **Task**: Individual tasks with status, priority, complexity, duration
  - Status: `TO_DO`, `SNOOZED`, `SKIPPED`, `IN_PROGRESS`, `PAUSED`, `COMPLETED`,
    `CANCELLED`
  - Can belong to a Project or Habit
  - Linked to Events (scheduled time slots)
- **Project**: Hierarchical projects with sub-projects
  - Status: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
  - Has start date, deadline, priority
- **Habit**: Recurring tasks with flexible recurrence patterns
  - Supports daily, weekly, monthly, yearly intervals
  - Weekday filtering, preferred times, custom rules
- **TaskCompletion**: Tracks when tasks were completed (time tracking)

#### Calendar & Events

- **Calendar**: User calendars (local or external)
  - Type: `LOCAL` or `EXTERNAL`
  - Provider: `GOOGLE` (extensible)
  - Color customization
- **Event**: Calendar events with start/end times
  - Can be linked to Tasks (scheduled tasks)
  - Supports all-day events

#### Scheduling Configuration

- **SchedulingConfig**: User scheduling preferences
  - Timezone, planning horizon
  - Task splitting, rescheduling policies
  - Rescheduling aggressiveness
- **WorkingPreferences**: Detailed working preferences
  - Working hours (earliest/latest time)
  - Daily max/optimal minutes
  - Working days (weekday array)
  - Focus periods, break durations
  - Energy profile (24-hour alertness array)
- **ExcludedPeriod**: Time periods to exclude from scheduling

### Relationships

```
User
├── Projects (one-to-many)
├── Tasks (one-to-many)
├── Habits (one-to-many)
├── Calendars (one-to-many)
├── SchedulingConfig (one-to-one)
├── WorkingPreferences (one-to-one)
└── ExcludedPeriods (one-to-many)

Project
├── Tasks (one-to-many)
└── SubProjects (self-referential)

Habit
└── Tasks (one-to-many, occurrences)

Calendar
└── Events (one-to-many)

Task
├── Project (many-to-one, optional)
├── Habit (many-to-one, optional)
├── Events (one-to-many)
└── TaskCompletions (one-to-many)
```

---

## API Architecture

### tRPC Setup

The application uses tRPC for type-safe API communication:

- **Context**: Includes database client, session, and headers
- **Procedures**:
  - `publicProcedure`: Unauthenticated endpoints
  - `protectedProcedure`: Requires authentication
- **Middleware**: Timing middleware for performance monitoring
- **Transformer**: SuperJSON for Date/Map/Set serialization

### API Routers

1. **taskRouter** (`/api/trpc/task.*`)
   - `create`: Create task with AI inference
   - `getById`: Get single task
   - `getAll`: List all user tasks
   - `update`: Update task
   - `updateMany`: Bulk update
   - `delete`: Delete task

2. **projectsRouter** (`/api/trpc/project.*`)
   - CRUD operations for projects
   - Sub-project management

3. **habitRouter** (`/api/trpc/habit.*`)
   - CRUD operations for habits
   - Recurrence pattern management

4. **calendarRouter** (`/api/trpc/calendar.*`)
   - Calendar CRUD
   - Google Calendar sync
   - Event management

5. **schedulerRouter** (`/api/trpc/scheduler.*`)
   - `schedule`: Generate schedule for tasks
   - `reschedule`: Re-optimize existing schedule
   - Configuration management

6. **onboardingRouter** (`/api/trpc/onboarding.*`)
   - Onboarding flow management

### Service Layer

Services encapsulate business logic:

- **SchedulerService**: Orchestrates scheduling workflow
- **CalendarService**: Calendar and event management
- **EventService**: Event CRUD operations
- **PreferencesService**: User preferences management
- **AIService**: OpenAI integration for field inference
- **CacheService**: Redis caching layer

---

## Scheduling System

### Overview

The scheduling system uses constraint programming to optimally schedule tasks
based on:

- Task priorities and deadlines
- User's working hours and availability
- Energy profile (matching complexity to alertness)
- Calendar busy slots
- Location clustering
- Workload balance

### Architecture

```
User Request
    │
    ▼
SchedulerService
    │
    ├─► Fetch Tasks (Prisma)
    ├─► Fetch Busy Slots (Calendar Events)
    ├─► Fetch Preferences (Working Hours, Energy Profile)
    │
    ▼
EnhancedScheduler
    │
    ├─► Validate Input
    ├─► Build Constraint Problem
    │   ├─► Variables (start times)
    │   ├─► Intervals (tasks, busy slots)
    │   ├─► Constraints (no overlap, deadlines, etc.)
    │   └─► Objective Function (maximize priority, energy match)
    │
    ▼
SolverClient
    │
    ├─► HTTP POST to Solver Service
    │
    ▼
Python Solver Service (FastAPI)
    │
    ├─► OR-Tools CP-SAT Solver
    │   ├─► Build Model
    │   ├─► Solve Constraints
    │   └─► Return Solution
    │
    ▼
EnhancedScheduler
    │
    ├─► Parse Solution
    ├─► Analyze Soft Constraints
    ├─► Extend Horizon (if needed)
    │
    ▼
ScheduleResponse
    │
    ├─► Scheduled Tasks
    ├─► Status (optimal/feasible/impossible)
    └─► Analysis (energy match, clustering, balance)
```

### Constraint Types

1. **Hard Constraints** (must be satisfied):
   - No overlap between tasks
   - Tasks within working hours
   - Tasks don't overlap with busy slots
   - Deadline constraints

2. **Soft Constraints** (optimized for):
   - Energy-complexity matching
   - Location clustering
   - Workload balance
   - Priority maximization

### Solver Service

The solver is a separate Python microservice:

- **Framework**: FastAPI
- **Solver**: Google OR-Tools CP-SAT
- **Communication**: HTTP REST API
- **Deployment**: Docker container
- **Features**:
  - Configurable timeout
  - Multi-worker support
  - Health check endpoint
  - Error handling

### Scheduling Flow

1. **Input Collection**: Gather tasks, events, preferences
2. **Validation**: Normalize and validate inputs
3. **Problem Building**: Convert to constraint problem
4. **Solving**: Send to solver service
5. **Solution Parsing**: Extract scheduled times
6. **Analysis**: Evaluate soft constraint satisfaction
7. **Horizon Extension**: If success rate < threshold, extend time horizon
8. **Response**: Return scheduled tasks with metadata

---

## Authentication & Authorization

### Better Auth

The application uses Better Auth for authentication:

- **Provider**: Prisma adapter with PostgreSQL
- **Social Auth**: Google OAuth with calendar scopes
- **Session Management**: Token-based sessions
- **Features**:
  - Automatic calendar creation on signup
  - Session tracking (IP, user agent)
  - Email verification support

### Authorization

- **Protected Routes**: App routes require authentication
- **tRPC Procedures**: `protectedProcedure` enforces user context
- **Data Isolation**: All queries filtered by `userId`
- **Session Guard**: Client-side route protection

### OAuth Scopes

Google OAuth requests these scopes:

- `calendar.events` - Create/manage events
- `calendar.calendarlist.readonly` - Read calendar list
- `calendar.calendars.readonly` - Read calendar details
- `calendar.events.readonly` - Read events

---

## Frontend Architecture

### Component Structure

1. **UI Components** (`components/ui/`)
   - shadcn/ui primitives
   - Accessible, unstyled components
   - Tailwind CSS styling

2. **Feature Components**
   - **Event Calendar**: Full calendar with views (month/week/day/agenda)
   - **Data Tables**: Sortable, filterable tables for tasks/projects/habits
   - **Item Dialogs**: Forms for creating/editing items
   - **Sidebar**: Navigation and calendar widget

3. **Layout Components**
   - **App Layout**: Sidebar + content area
   - **Page Layout**: Consistent page structure
   - **Page Header**: Title and actions

### State Management

- **Server State**: TanStack Query for API data
- **Client State**:
  - React hooks for local state
  - Zustand for global client state
  - Context API for calendar state

### Routing

- **App Router**: Next.js 15 App Router
- **Route Groups**: `(app)` for protected routes
- **Dynamic Routes**: `[path]`, `[id]`, etc.
- **Layouts**: Nested layouts for shared UI

### Data Fetching

- **tRPC Hooks**: Generated hooks from routers
- **React Query**: Caching, refetching, mutations
- **Server Components**: Direct database access where appropriate

---

## External Services

### Google Calendar API

- **Purpose**: Calendar synchronization
- **Integration**: OAuth flow with calendar scopes
- **Features**:
  - Read external calendars
  - Create/manage events
  - Sync busy slots for scheduling

### OpenAI API (Optional)

- **Purpose**: AI-powered field inference
- **Usage**: Infer task duration, complexity, priority
- **Integration**: `ai-infer-service.ts`
- **Features**: Natural language task description parsing

### Upstash Redis

- **Purpose**: Caching and session storage
- **Usage**: Cache service for frequently accessed data
- **Configuration**: Environment variables for connection

### Solver Service

- **Purpose**: Constraint optimization
- **Protocol**: HTTP REST API
- **Deployment**: Separate Docker container
- **Configuration**: `SOLVER_SERVICE_URL`, `SOLVER_TIMEOUT_MS`

---

## Development Workflow

### Prerequisites

- Node.js (v20+)
- PostgreSQL database
- Python 3.11+ (for solver service)
- npm or compatible package manager

### Environment Variables

Required environment variables (see `src/env.js`):

```env
# Database
DATABASE_URL=postgresql://...

# Authentication
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Redis (Upstash)
KV_URL=...
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
REDIS_URL=...

# Solver Service
SOLVER_SERVICE_URL=http://localhost:8000
SOLVER_TIMEOUT_MS=10000

# Optional
OPENAI_API_KEY=...
```

### Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   ```bash
   npm run db:generate  # Generate Prisma client
   npm run db:push      # Push schema to database
   ```

3. **Start Development Server**
   ```bash
   npm run dev          # Next.js dev server (with Turbo)
   ```

4. **Start Solver Service** (separate terminal)
   ```bash
   cd src/server/lib/solver_service
   # Follow Python service setup instructions
   ```

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - TypeScript type checking
- `npm run format:write` - Format code with Prettier
- `npm run db:studio` - Open Prisma Studio
- `npm run db:migrate` - Run migrations

### Code Quality

- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js recommended rules
- **Prettier**: Code formatting
- **Type Safety**: End-to-end with tRPC

### Testing

- Type checking: `npm run typecheck`
- Linting: `npm run lint`
- Build verification: `npm run build`

---

## Key Design Decisions

1. **T3 Stack**: Chosen for type safety and developer experience
2. **tRPC**: End-to-end type safety without code generation
3. **Prisma**: Type-safe database access with migrations
4. **Microservice Solver**: Separated for performance and scalability
5. **Constraint Programming**: Optimal scheduling with OR-Tools
6. **Better Auth**: Modern auth framework with Prisma integration
7. **App Router**: Next.js 15 App Router for modern React patterns
8. **Radix UI**: Accessible component primitives
9. **TanStack Query**: Robust server state management

---

## Future Considerations

### Potential Enhancements

1. **Task Splitting**: Split long tasks across multiple time slots
2. **Rescheduling Policies**: Automatic rescheduling on calendar changes
3. **Energy Mode Preferences**: Different task types for different energy levels
4. **Location Optimization**: Better location clustering
5. **Multi-Calendar Support**: Additional calendar providers