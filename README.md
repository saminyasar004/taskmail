<div align="center">

# Taskmail

### Stop reading 50 emails to find the 3 that actually need action.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)](https://nextjs.org)
[![Hono](https://img.shields.io/badge/Hono-v4-orange?logo=hono)](https://hono.dev)
[![Gemini](https://img.shields.io/badge/Gemini-1.5_Flash-blue?logo=google)](https://ai.google.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-teal?logo=postgresql)](https://neon.tech)

[Live Demo](#) · [Report Bug](issues) · [Request Feature](issues)

</div>

---

## The Problem

Most people receive 100+ emails every day. But email clients only show you a list. They don't tell you what is urgent, what has a deadline, or what actually needs a reply. So you end up spending 2-3 hours just reading through everything to figure out what to do.

That is a lot of time wasted on something that should be automatic.

## The Solution

Taskmail connects to your Gmail inbox. Every time a new email arrives, it sends that email through an AI pipeline. The AI reads it, decides if any action is needed, extracts deadlines, and creates a task automatically if required. Every morning you get a daily briefing that tells you exactly what to focus on for the day.

No more manually going through your inbox to figure out your priorities.

---

## How It Works

```
New email arrives in Gmail
        |
Google Pub/Sub sends a push notification to Taskmail
        |
Hono server fetches the full email via Gmail API
        |
Gemini 1.5 Flash analyzes: priority, deadline, action required, category
        |
If action required -> Task auto-created in PostgreSQL
        |
Dashboard updates + Daily briefing generated each morning
```

---

## System Architecture

> **Frontend** -> Next.js 15 (App Router) deployed on Vercel  
> **Backend** -> Hono on Node.js deployed on Render  
> **Database** -> PostgreSQL via Neon (serverless)  
> **ORM** -> Prisma  
> **AI** -> Google Gemini 1.5 Flash API  
> **Email** -> Gmail API + Google Pub/Sub push notifications  
> **Auth** -> Google OAuth 2.0 via NextAuth.js

```
+--------------------------------------------------------------------------+
|                            USER BROWSER                                  |
|                                                                          |
|   +----------------------------------------------------------------------+
|   |              Next.js 15 Frontend (Vercel)                            |
|   |  Dashboard  |  Task Manager  |  Daily Briefing  |  Manual Task Form  |
|   +---------------------------+---------------------------+--------------+
|                               |  REST API calls           |  Auth
+-------------------------------+---------------------------+--------------+
                                |                           |
               +----------------v----------+   +-----------v--------------+
               |   Hono API Server         |   |   Google OAuth 2.0       |
               |   (Node.js / Render)      |   |   NextAuth.js            |
               |                           |   +--------------------------+
               |  /api/gmail/webhook  <----+--------- Google Pub/Sub
               |  /api/tasks               |          (push notifications)
               |  /api/emails              |
               |  /api/briefing            |
               +----------+----------------+
                          |
             +------------+------------+
             |                         |
  +----------v--------+   +------------v-------+
  |  Neon Postgres    |   |  Gemini 1.5 Flash  |
  |  + Prisma ORM     |   |                    |
  |                   |   |  Email ->          |
  |  users            |   |  Priority          |
  |  emails           |   |  Deadline          |
  |  tasks            |   |  Actions           |
  |  briefings        |   +--------------------+
  +-------------------+
                                        +--------------------+
                                        |   Gmail API        |
                                        |   (fetch message)  |
                                        +--------------------+
```

---

## Core Features

### Email intelligence engine

Every incoming email gets analyzed automatically. Taskmail generates a short summary, assigns a priority level (Critical / High / Medium / Low / Informational), detects if any action is needed, extracts deadlines, and puts the email into a category like Client Request, Invoice, Sales Opportunity and so on.

### Automatic task creation

If an email needs action, Taskmail creates a task for it automatically. The task includes a title, description, priority, deadline and status. You do not have to do anything manually.

### AI task dashboard

One place to see all your urgent emails, open tasks, upcoming deadlines and AI recommendations for the day. Everything is organized so you know what to do next.

### Daily executive briefing

Every morning, Taskmail generates a summary for you. It shows how many important emails came in, what tasks are due today, and what the AI thinks you should work on first. Like having a personal assistant prepare your day.

### Manual task management

You can also create tasks by yourself when needed. The AI will suggest priority, deadline and category based on what you write.

---

## Tech Stack

| Layer      | Technology                 | Why                                            |
| ---------- | -------------------------- | ---------------------------------------------- |
| Frontend   | Next.js 15 (App Router)    | File-based routing, server components, fast    |
| Styling    | Tailwind CSS               | Utility-first, no bloat                        |
| Backend    | Hono on Node.js            | Lightweight, fast, TypeScript-native           |
| Database   | PostgreSQL (Neon)          | Serverless Postgres, free tier, branching      |
| ORM        | Prisma                     | Type-safe queries, clean migrations            |
| AI         | Gemini 1.5 Flash           | Free tier, fast, excellent for JSON extraction |
| Email      | Gmail API + Pub/Sub        | Real-time push, no polling needed              |
| Auth       | Google OAuth + NextAuth.js | Seamless Gmail permission flow                 |
| Deployment | Vercel (FE) + Render (BE)  | Both free for MVP                              |

---

## Database Schema

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  accessToken   String
  refreshToken  String
  watchExpiry   DateTime?
  createdAt     DateTime  @default(now())
  emails        Email[]
  tasks         Task[]
  briefings     Briefing[]
}

model Email {
  id          String   @id @default(cuid())
  gmailId     String   @unique
  from        String
  subject     String
  summary     String
  priority    Priority
  category    Category
  hasAction   Boolean
  deadline    DateTime?
  rawSnippet  String
  processedAt DateTime @default(now())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  task        Task?
}

model Task {
  id          String     @id @default(cuid())
  title       String
  description String?
  priority    Priority
  deadline    DateTime?
  status      TaskStatus @default(OPEN)
  source      String     @default("manual")
  createdAt   DateTime   @default(now())
  userId      String
  user        User       @relation(fields: [userId], references: [id])
  emailId     String?    @unique
  email       Email?     @relation(fields: [emailId], references: [id])
}

model Briefing {
  id          String   @id @default(cuid())
  date        DateTime @default(now())
  content     Json
  userId      String
  user        User     @relation(fields: [userId], references: [id])
}

enum Priority { CRITICAL HIGH MEDIUM LOW INFORMATIONAL }
enum Category { CLIENT_REQUEST SALES INVOICE INTERNAL PARTNERSHIP LEGAL SUPPORT ADMIN OTHER }
enum TaskStatus { OPEN IN_PROGRESS WAITING COMPLETED }
```

---

## API Reference

### Webhook (called by Google Pub/Sub)

```
POST /api/gmail/webhook
Body: { message: { data: base64encodedPubSubMessage } }
```

### Tasks

```
GET    /api/tasks          -> list all tasks for authenticated user
POST   /api/tasks          -> create a manual task
PATCH  /api/tasks/:id      -> update task status or fields
DELETE /api/tasks/:id      -> delete a task
```

### Emails

```
GET /api/emails            -> list analyzed emails with filters
GET /api/emails/:id        -> get single email analysis
```

### Briefing

```
GET  /api/briefing/today   -> get today's briefing (generate if missing)
POST /api/briefing/trigger -> manually trigger briefing generation
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- A Google Cloud project with Gmail API and Pub/Sub enabled
- Neon database (free at neon.tech)
- Gemini API key (free at ai.google.dev)

### 1. Clone and install

```bash
git clone https://github.com/yourusername/taskmail.git
cd taskmail

# Frontend
cd apps/web && npm install

# Backend
cd apps/api && npm install
```

### 2. Environment variables

**Backend (`apps/api/.env`)**

```env
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GEMINI_API_KEY=
PUBSUB_PROJECT_ID=
PUBSUB_TOPIC_NAME=
WEBHOOK_SECRET=
```

**Frontend (`apps/web/.env.local`)**

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Database setup

```bash
cd apps/api
npx prisma migrate dev
npx prisma generate
```

### 4. Run locally

```bash
# In apps/api
npm run dev      # Hono server on :3001

# In apps/web
npm run dev      # Next.js on :3000
```

### 5. Set up Gmail push notifications

For local development, use [ngrok](https://ngrok.com) to expose your webhook endpoint:

```bash
ngrok http 3001
# Copy the https URL and set it as your Pub/Sub push endpoint
```

In Google Cloud Console: go to Pub/Sub, create a topic, create a push subscription, and set the endpoint to `https://your-ngrok-url/api/gmail/webhook`

---

## Project Structure

```
taskmail/
+-- apps/
|   +-- web/                    # Next.js frontend
|   |   +-- app/
|   |   |   +-- (auth)/         # Login page
|   |   |   +-- dashboard/      # Main dashboard
|   |   |   +-- tasks/          # Task management
|   |   |   +-- briefing/       # Daily briefing view
|   |   +-- components/
|   +-- api/                    # Hono backend
|       +-- src/
|       |   +-- routes/         # gmail.ts, tasks.ts, emails.ts, briefing.ts
|       |   +-- services/       # gemini.ts, gmail.ts, pubsub.ts
|       |   +-- lib/            # prisma.ts, auth.ts
|       +-- prisma/
|           +-- schema.prisma
+-- packages/
    +-- types/                  # Shared TypeScript types
```

---

## Roadmap

**v1 (current MVP)**

- [x] Gmail integration + Pub/Sub push notifications
- [x] AI email analysis (priority, deadline, action items, category)
- [x] Automatic task creation
- [x] Task dashboard
- [x] Daily briefing generation
- [x] Manual task management

**v2**

- [ ] Google Calendar integration (deadlines -> calendar events)
- [ ] AI reply suggestions
- [ ] Voice notes -> tasks
- [ ] Meeting scheduling assistance

**v3**

- [ ] CRM integration
- [ ] WhatsApp Business API
- [ ] Multi-agent workflows
- [ ] Team collaboration features

---

## Contributing

Contributions are welcome. Please open an issue first to discuss what you want to change.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'add: your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## Author

**Samin Yasar** - Full-stack developer based in Bangladesh.  
Building with React, Next.js, TypeScript, Hono, PostgreSQL and cloud infrastructure.

[![Portfolio](https://img.shields.io/badge/Portfolio-saminyasar.dev-blue)](https://saminyasar.dev)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?logo=linkedin)](https://linkedin.com/in/saminyasar04)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-black?logo=github)](https://github.com/saminyasar004)

---

## License

MIT. See [LICENSE](LICENSE) for details.
