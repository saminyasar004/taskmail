# Taskmail Development Plan

This document outlines the detailed system architecture, component design, authentication flows, data schema, API specifications, and development phases for **Taskmail** - an AI-driven email intelligence and automated task management system.

---

## 1. Monorepo Architecture

We will set up a monorepo structure in this repository. Since the project uses Hono, Next.js, and shared types, we will use **npm workspaces** for dependency management and workspace coordination.

```
taskmail/
├── package.json                # Root package.json managing workspaces
├── plan.md                     # This detailed plan (Finalized)
├── todo.md                     # Complete checklist (A-Z) (Finalized)
├── docs/                       # Architecture diagrams
│   └── architecture.svg
├── apps/
│   ├── api/                    # Hono Backend API
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts        # Entry point
│   │   │   ├── routes/         # Route Handlers
│   │   │   │   ├── gmail.ts
│   │   │   │   ├── tasks.ts
│   │   │   │   ├── emails.ts
│   │   │   │   └── briefing.ts
│   │   │   ├── services/       # Core Business Logic
│   │   │   │   ├── gemini.ts
│   │   │   │   ├── gmail.ts
│   │   │   │   └── pubsub.ts
│   │   │   └── lib/            # Shared Library instances
│   │   │       ├── prisma.ts
│   │   │       └── auth.ts
│   │   └── prisma/
│   │       ├── schema.prisma   # Prisma DB Schema
│   │       └── migrations/
│   └── web/                    # Next.js 15 Frontend
│       ├── package.json
│       ├── next.config.ts
│       ├── tailwind.config.ts  # Tailwind CSS Config
│       ├── src/ (or app/)
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx        # Landing / Login page
│       │   │   ├── dashboard/      # Tasks/email summary
│       │   │   ├── tasks/          # Manual & auto-created tasks
│       │   │   └── briefing/       # Daily executive summary
│       │   └── components/
│       │       ├── ui/             # Reusable design tokens
│       │       └── layout/
└── packages/
    └── types/                  # Shared TypeScript models/interfaces
        ├── package.json
        └── index.ts
```

---

## 2. Database Schema (Prisma & Neon PostgreSQL)

The backend will use Prisma connected to Neon PostgreSQL. The schema is specified as follows:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String     @id @default(cuid())
  email         String     @unique
  name          String?
  accessToken   String
  refreshToken  String
  watchExpiry   DateTime?
  createdAt     DateTime   @default(now())
  emails        Email[]
  tasks         Task[]
  briefings     Briefing[]
}

model Email {
  id          String    @id @default(cuid())
  gmailId     String    @unique
  from        String
  subject     String
  summary     String
  priority    Priority
  category    Category
  hasAction   Boolean
  deadline    DateTime?
  rawSnippet  String
  processedAt DateTime  @default(now())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  task        Task?
}

model Task {
  id          String     @id @default(cuid())
  title       String
  description String?
  priority    Priority
  deadline    DateTime?
  status      TaskStatus @default(OPEN)
  source      String     @default("manual") // "manual" or "email"
  createdAt   DateTime   @default(now())
  userId      String
  user        User       @relation(fields: [userId], references: [id])
  emailId     String?    @unique
  email       Email?     @relation(fields: [emailId], references: [id])
}

model Briefing {
  id          String   @id @default(cuid())
  date        DateTime @default(now())
  content     Json     // Structured JSON payload representing briefing details
  userId      String
  user        User     @relation(fields: [userId], references: [id])
}

enum Priority {
  CRITICAL
  HIGH
  MEDIUM
  LOW
  INFORMATIONAL
}

enum Category {
  CLIENT_REQUEST
  SALES
  INVOICE
  INTERNAL
  PARTNERSHIP
  LEGAL
  SUPPORT
  ADMIN
  OTHER
}

enum TaskStatus {
  OPEN
  IN_PROGRESS
  WAITING
  COMPLETED
}
```

---

## 3. Authentication & Token Lifecycle

### Google OAuth Flow
1. **Frontend Authentication**:
   - Built using **NextAuth.js** (Auth.js) on the Next.js frontend app.
   - Google Provider configured with scopes:
     - `openid`
     - `email`
     - `profile`
     - `https://www.googleapis.com/auth/gmail.readonly` (read emails)
     - `https://www.googleapis.com/auth/gmail.modify` (mark as read/unread or manage labels if needed)
   - We will request offline access by specifying:
     - `authorization: { params: { access_type: "offline", prompt: "consent" } }`
     This ensures we receive a `refresh_token` on the first sign-in.

2. **Token Synchronization**:
   - In the NextAuth `signIn` callback or `jwt` callback, when a user successfully authenticates and returns tokens:
     - Upsert the `User` in PostgreSQL via Prisma.
     - Store the user's `email`, `name`, `accessToken`, and `refreshToken`.
     - *Note*: Since the refresh token is only sent on the first authorization (when prompt is consent), we must ensure it is saved securely and never overwritten with a null value on subsequent logins.

3. **Backend API Authentication & Proxying**:
   - Next.js will configure a server rewrite/proxy (via `next.config.ts` or custom middleware) routing `/api/*` requests through the Next.js origin directly to the Hono backend (port 3001).
   - This approach resolves cross-domain cookie restrictions.
   - Hono will verify session authenticity by decoding the NextAuth JWT session cookie (`next-auth.session-token` or `__Secure-next-auth.session-token`) using `jose` with the shared `NEXTAUTH_SECRET` value.

---

## 4. Backend Service Architecture (Hono)

The Hono application consists of four primary route files and three internal services.

### Services

#### A. `gmail.ts` (Gmail API Integration)
- Implements `fetchEmailDetails(userId: string, gmailId: string)`:
  - Retrieves Google OAuth credentials from the Database.
  - Instantiates the Google API client.
  - If the access token is expired, requests a new one using the `refreshToken` and updates the DB.
  - Fetches the email content (Sender, Subject, Body snippet, attachments metadata).
- Implements `setupWatch(userId: string)`:
  - Calls `users.watch` endpoint with Pub/Sub topic details.
  - Schedules renewal since Gmail watch subscriptions expire every 7 days (saves `watchExpiry` in DB).

#### B. `gemini.ts` (Gemini 1.5 Flash Pipeline)
- Utilizes `@google/genai` or `@google/generative-ai` SDK.
- Connects using `GEMINI_API_KEY`.
- Defines structured JSON schema for response output to avoid parsing errors.
- Prompt details:
  - System Instructions: Act as a high-fidelity Email Intelligence agent. Determine priority, category, deadline, summary, and action requirements.
  - Response Output JSON structure:
    ```json
    {
      "summary": "Brief 1-2 sentence summary of the email.",
      "priority": "CRITICAL | HIGH | MEDIUM | LOW | INFORMATIONAL",
      "category": "CLIENT_REQUEST | SALES | INVOICE | INTERNAL | PARTNERSHIP | LEGAL | SUPPORT | ADMIN | OTHER",
      "hasAction": true,
      "deadline": "YYYY-MM-DDTHH:mm:ssZ" // or null if none detected
      "suggestedTask": {
        "title": "Short action item title",
        "description": "Elaborated description of what needs to be done based on the email context"
      } // only present if hasAction is true
    }
    ```

#### C. `pubsub.ts` (Google Pub/Sub Handler)
- Decodes the Pub/Sub push notification payload.
- Pub/Sub message body format: `{"message": {"data": "base64String", "messageId": "..."}}`.
- Base64 decodes data to get `{"emailAddress": "...", "historyId": ...}`.
- Triggers background fetching of the latest emails since the last processed `historyId` or simply requests the newest unread messages.

#### D. `briefing.ts` (Daily Briefing Generator)
- Triggers daily at a set time (e.g., 6:00 AM) or on demand.
- Fetches all user tasks with status `OPEN` or `IN_PROGRESS`.
- Fetches emails processed in the last 24 hours (with emphasis on `CRITICAL` or `HIGH` priority).
- Sends this data to Gemini with a prompt to synthesize a "Daily Briefing".
- Save response to `Briefing` table. JSON payload format:
  ```json
  {
    "greeting": "Good morning, Samin. Here is your briefing...",
    "criticalAlertsCount": 2,
    "tasksDueToday": [...],
    "importantEmailsSummary": [...],
    "aiRecommendations": [
       "Reply to Client X's invoice request first - deadline is at 2 PM.",
       "Review sales lead email from Y."
    ]
  }
  ```

---

## 5. Webhook Pipeline Workflow

1. A new email lands in the user's Gmail.
2. Google Pub/Sub sends a `POST /api/gmail/webhook` push notification to our Hono backend.
3. Hono backend:
   - Validates webhook secret header.
   - Extracts the Gmail user ID / email address from the payload.
   - Fetches the User record to get current tokens.
   - Contacts Gmail API to retrieve the detailed email contents.
   - Feeds details to the Gemini Service.
   - Gemini returns metadata (Priority, Category, Summary, Action Needed, Deadline).
   - Saves `Email` record.
   - If `hasAction` is true, automatically creates a `Task` record linked to the `Email` record with status `OPEN`.
   - Sends SSE (Server-Sent Events) or WebSockets signal (or client relies on polling/refetching) to update the dashboard UI.

---

## 6. Frontend UI/UX Design

The UI will be designed to feel premium, featuring Tailwind CSS v4, glassmorphism, smooth animations, dark modes, and modern typography (using Google Font `Inter` or `Outfit`).

### Pages

#### A. Landing Page / Auth (`/`)
- Sleek dark background with glowing gradient blobs.
- Value proposition: "Stop reading 50 emails. Start checking off action items."
- Clean Google Sign-In button that requests Gmail scopes.

#### B. Dashboard (`/dashboard`)
- High-level KPIs: Open tasks, critical actions, today's briefings status.
- **Morning Briefing Card**: A beautiful newspaper-like read-out summarizing the day's priority actions.
- **Recent Emails Feed**: Cards displaying analyzed emails with priority badges (red for Critical, orange for High, etc.), category tags, AI-generated summary, and action indicators. Clicking an email reveals details and its associated task status.

#### C. Tasks Board (`/tasks`)
- Kanban board or interactive list (categorized by Open, In Progress, Waiting, Completed).
- Custom filters for priority and source ("auto-created" vs "manual").
- Quick status switcher.
- **Create Task Form**: Includes "AI Suggester" button. If the user types a description, they can hit "Auto-fill with AI" to let Gemini suggest priority, categories, and deadlines.

#### D. Daily Briefing (`/briefing`)
- A beautiful, immersive reader mode focusing on the AI-generated briefing text, actionable items, and dynamic calendar links.

---

## 7. Finalized Design Decisions

1. **CSS Framework**: Tailwind CSS (v4.0) will be used for maximum developer speed and premium responsive UI.
2. **Auth & Cookies**: NextAuth session cookie-based verification will be handled on the Hono backend. A server-side proxy route `/api/*` will be set up in Next.js to forward requests to the Hono backend synchronously, eliminating cross-domain cookie and CORS issues.
3. **Webhook Tunneling**: Local webhook testing will use `localtunnel` (`npx localtunnel --port 3001`) to tunnel incoming Google Pub/Sub alerts directly to the Hono server API.

---

## 8. Verification & Testing Plan

### Automated Local Verification
- Mock environment testing for Hono routes using `supertest` or Hono client helpers.
- Run database migrations locally using a Postgres container or local DB.
- Unit tests for the Gemini service parser: supplying mock emails and testing JSON structure validation.

### Manual Verification
- Testing Gmail OAuth scopes flow by logging in with a Google developer test account.
- Simulating webhook payload trigger using localtunnel + Google Pub/Sub subscription setup, or local API test scripts.
- Validating dashboard updates live when a new task is auto-created.
