# Taskmail Implementation Checklist (A-Z)

This todo list outlines the exact steps required to implement the Taskmail monorepo from scratch. Mark items as completed (`[x]`) as you make progress.

---

## Phase 1: Monorepo & Project Setup
- [x] Initialize Root Workspace:
  - [x] Run `npm init -y` in the project root.
  - [x] Add `workspaces` field to root `package.json`: `["apps/*", "packages/*"]`.
- [x] Create Directory Structure:
  - [x] Create `apps/` and `packages/` directories.
  - [x] Create `apps/web/` (Next.js frontend).
  - [x] Create `apps/api/` (Hono backend).
  - [x] Create `packages/types/` (Shared types).
- [x] Setup Shared TypeScript Configuration:
  - [x] Initialize `tsconfig.json` at root.
  - [x] Configure `packages/types/package.json` and export shared interfaces (User, Email, Task, Briefing).

---

## Phase 2: Database & ORM Setup
- [x] Initialize Prisma in `apps/api`:
  - [x] Install `@prisma/client` and `prisma` dev dependency.
  - [x] Initialize Prisma schema: `npx prisma init`.
- [x] Define Database Models in `apps/api/prisma/schema.prisma`:
  - [x] Add `User`, `Email`, `Task`, `Briefing` models.
  - [x] Define `Priority`, `Category`, and `TaskStatus` enums.
  - [x] Establish relations between `User-Email`, `User-Task`, `User-Briefing`, and `Email-Task`.
- [/] Database Connection:
  - [x] Configure `DATABASE_URL` in `apps/api/.env` (Placeholder).
  - [ ] Run initial migration: `npx prisma migrate dev --name init` (Requires active Neon/Postgres DB URL).
  - [x] Generate Prisma Client: `npx prisma generate`.
  - [x] Create a prisma client singleton in `apps/api/src/lib/prisma.ts`.

---

## Phase 3: Frontend Authentication (NextAuth.js) & Proxy Setup
- [x] Setup Next.js 15 Project in `apps/web`:
  - [x] Install NextAuth.js: `npm install next-auth`.
  - [x] Configure `apps/web/.env.local` with `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`.
- [x] Setup NextAuth.js Route:
  - [x] Create `/api/auth/[...nextauth]` route handler.
  - [x] Configure Google Provider with offline access options to request `refresh_token` and appropriate scopes (`gmail.readonly`, `gmail.modify`).
- [x] Setup Database Synchronization:
  - [x] In the NextAuth `signIn` callback:
    - [x] Perform custom database upsert using Prisma Client to save or update the User record along with `accessToken` and `refreshToken`.
- [x] Setup Session Provider:
  - [x] Create a client-side Session provider wrapper.
  - [ ] Use NextAuth session hooks to display user credentials in UI (UI implementation details).
- [x] Setup Next.js rewrites in `next.config.ts`:
  - [x] Configure a rewrite of `/api/:path*` to `http://localhost:3001/api/:path*` to forward API calls to Hono backend seamlessly.

---

## Phase 4: Backend API Foundation (Hono)
- [x] Initialize Hono Server in `apps/api`:
  - [x] Install `hono` and Node.js adapter.
  - [x] Create main server entry point in `apps/api/src/index.ts`.
- [x] Configure Middlewares:
  - [x] Setup CORS middleware to allow Next.js requests.
  - [x] Setup logging middleware.
  - [x] Setup global error handler and not-found handler.
- [x] Implement Session Auth Middleware:
  - [x] Create authentication helper in `apps/api/src/lib/auth.ts`.
  - [x] Add logic to decode NextAuth session cookie using shared `NEXTAUTH_SECRET` and extract user context (email/userId).

---

## Phase 5: Google Services & Webhooks
- [x] Google Cloud Setup: (User actions in Console)
  - [x] Enable Gmail API and Google Pub/Sub API in Developer Console.
  - [x] Setup a Pub/Sub Topic and Push Subscription pointing to the webhook url `/api/gmail/webhook`.
- [x] Setup Hono Webhook Endpoint:
  - [x] Create `POST /api/gmail/webhook` route in `apps/api/src/routes/gmail.ts`.
  - [x] Implement webhook payload verification (checking secret tokens if configured).
- [x] Webhook Processing Logic:
  - [x] Extract Pub/Sub payload, decode base64 message containing the watch notification details.
  - [x] Retrieve user by email from the payload details.
  - [x] Trigger background fetch task to download newly received emails (Tied to Phase 7).
- [x] Gmail API Service:
  - [x] Implement `apps/api/src/services/gmail.ts` helper methods.
  - [x] Handle access token refreshing when encountering authentication failures (Google API `tokens` listener).
  - [x] Implement Gmail `users.watch` subscription registration and store `watchExpiry` in database.
  - [x] Set up a recurring script/cron mechanism or Hono endpoint to automatically re-subscribe to the watch before the 7-day expiration (Tied to Phase 7).

---

## Phase 6: Gemini 1.5 Flash AI Engine
- [x] Setup Gemini SDK:
  - [x] Install `@google/genai` or `@google/generative-ai` in `apps/api`.
  - [x] Configure `GEMINI_API_KEY` in `apps/api/.env`.
- [x] Implement AI Analyzer Service:
  - [x] Create `apps/api/src/services/gemini.ts`.
  - [x] Construct the system prompt explaining role, criteria for priorities, categories, and task detection.
  - [x] Configure structured JSON Schema options to guarantee model outputs exact JSON fields matching backend expectations.
  - [x] Add fallback handler in case of rate-limiting or parsing failures.

---

## Phase 7: Email & Task Processing Engine
- [x] Implement Webhook Engine Logic:
  - [x] Once new email content is fetched via Gmail API, send it to the Gemini Analyzer.
  - [x] Store processed email details in the `Email` database table.
  - [x] If `hasAction` is true:
    - [x] Automatically create a corresponding `Task` record in the database linked to the email.
    - [x] Default task status to `OPEN` and set source to `email`.
- [x] Test the Complete Webhook Pipeline:
  - [x] Expose backend port locally using `localtunnel` (`npx localtunnel --port 3001`).
  - [x] Set localtunnel URL as the Pub/Sub push subscription endpoint.
  - [x] Verify database updates (Email inserted, Task auto-inserted).

---

## Phase 8: Daily Briefing Generator
- [x] Implement Briefing Service:
  - [x] Create briefing compiler in `apps/api/src/services/briefing.ts` (or trigger helper).
  - [x] Aggregation logic: query unresolved high/critical emails from past 24 hours + all currently open tasks.
  - [x] Prompt Gemini to compile an executive-style daily briefing.
  - [x] Save output as a JSON payload in the `Briefing` database table.
- [x] Implement Briefing API Routes:
  - [x] `GET /api/briefing/today` -> Returns today's briefing, generating it if it doesn't exist.
  - [x] `POST /api/briefing/trigger` -> Manually triggers generation.

---

## Phase 9: Core API Endpoints
- [x] Implement Task Routes (`apps/api/src/routes/tasks.ts`):
  - [x] `GET /api/tasks` -> List authenticated user's tasks (support status/priority filters).
  - [x] `POST /api/tasks` -> Create a manual task.
  - [x] `PATCH /api/tasks/:id` -> Update task status, description, priority, etc.
  - [x] `DELETE /api/tasks/:id` -> Delete a task.
- [x] Implement Email Routes (`apps/api/src/routes/emails.ts`):
  - [x] `GET /api/emails` -> List processed emails.
  - [x] `GET /api/emails/:id` -> Details of a single email.

---

## Phase 10: Next.js Frontend Development & Tailwind CSS v4
- [x] Initialize Tailwind CSS v4 styling in `apps/web`:
  - [x] Install `@tailwindcss/postcss` and `tailwindcss` (v4).
  - [x] Configure PostCSS and import `@import "tailwindcss";` in global CSS file.
- [x] Build Authentication flow UI:
  - [x] Basic landing page with branding and "Connect with Gmail" button.
- [x] Build Main Layout & Navigation:
  - [x] Responsive navigation sidebar (Dashboard, Tasks, Briefing, Settings).
- [x] Build Dashboard (`/dashboard`):
  - [x] Metric cards (Tasks Open, Unread Urgent, Priority breakdown).
  - [x] Today's Daily Briefing Card (interactive accordion / presentation).
  - [x] Recent Emails Widget.
- [x] Build Task Dashboard (`/tasks`):
  - [x] Status columns (Kanban view) or list filters.
  - [x] Drag-and-drop or click-to-move status updates.
  - [x] Manual Task Dialog: Include a text area to write down ideas, and a button to auto-extract details using a prompt endpoint.
- [x] Build Briefing Page (`/briefing`):
  - [x] Immersive read-out of the briefing content.
  - [x] Quick checklist of tasks due today.

---

## Phase 11: Deployment & Production Checklist
- [ ] Backend Deployment:
  - [ ] Deploy Hono API on Render.
  - [ ] Setup production PostgreSQL DB on Neon.
  - [ ] Set environment variables in Render console.
- [ ] Frontend Deployment:
  - [ ] Deploy Next.js 15 on Vercel.
  - [ ] Set NextAuth environments and API URLs.
- [ ] Google Console Updates:
  - [ ] Add production redirect URI to OAuth Consent Screen client config.
  - [ ] Update Google Pub/Sub push subscription endpoint to pointing to the production Render server URL.
