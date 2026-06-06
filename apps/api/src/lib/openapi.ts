// OpenAPI 3.0 specification for the Taskmail Hono backend.
// All endpoints must be documented here. See .agent.md rule #3 for the full requirement.
//
// Add a new entry under `paths` whenever you create a new route.

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Taskmail API",
    version: "1.0.0",
    description: `
## Overview

Taskmail is an AI-powered email intelligence system. This API powers the backend that:

- Receives Gmail push notifications via Google Pub/Sub
- Analyzes emails using Gemini 1.5 Flash to extract priority, deadlines, and action items
- Automatically creates tasks when emails require follow-up
- Generates daily executive briefings
- Provides CRUD operations for tasks and emails

## Authentication

Most endpoints require a valid NextAuth.js session. The session token is passed as an
HTTP-only cookie (\`next-auth.session-token\`). When testing via Swagger UI, first sign in
through the web app and then use the browser to make requests so the cookie is sent automatically.

## Base URL

- **Development**: \`http://localhost:3001\`
- **Production**: Your Render deployment URL
    `,
    contact: {
      name: "Samin Yasar",
      url: "https://saminyasar.dev",
    },
    license: {
      name: "MIT",
    },
  },
  tags: [
    {
      name: "Health",
      description: "Server health and status checks.",
    },
    {
      name: "Gmail",
      description:
        "Gmail integration - setting up inbox watch subscriptions and receiving Pub/Sub webhook notifications.",
    },
    {
      name: "Tasks",
      description:
        "Create, list, update, delete, and AI-suggest tasks. Tasks can be created manually or auto-generated from analyzed emails.",
    },
    {
      name: "Emails",
      description:
        "View analyzed emails. Emails are processed automatically via the webhook pipeline.",
    },
    {
      name: "Briefing",
      description:
        "Daily AI executive briefings that summarize open tasks and important emails.",
    },
  ],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "next-auth.session-token",
        description:
          "NextAuth.js session cookie. Sign in via the web app to get this cookie. It is sent automatically by the browser on same-domain requests.",
      },
    },
    schemas: {
      Priority: {
        type: "string",
        enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"],
        description:
          "Priority level of a task or email. CRITICAL means immediate action required. INFORMATIONAL means no action needed.",
        example: "HIGH",
      },
      TaskStatus: {
        type: "string",
        enum: ["OPEN", "IN_PROGRESS", "WAITING", "COMPLETED"],
        description: "Current status of a task.",
        example: "OPEN",
      },
      Category: {
        type: "string",
        enum: [
          "CLIENT_REQUEST",
          "SALES",
          "INVOICE",
          "INTERNAL",
          "PARTNERSHIP",
          "LEGAL",
          "SUPPORT",
          "ADMIN",
          "OTHER",
        ],
        description: "Category of the email content, detected by AI.",
        example: "CLIENT_REQUEST",
      },
      Task: {
        type: "object",
        properties: {
          id: { type: "string", description: "Unique cuid identifier.", example: "clxyz123" },
          title: { type: "string", description: "Short, actionable task title.", example: "Reply to invoice from Acme Corp" },
          description: {
            type: "string",
            nullable: true,
            description: "Detailed description of what needs to be done.",
            example: "Acme Corp sent an invoice for $4,200. Confirm receipt and request an itemized breakdown.",
          },
          priority: { $ref: "#/components/schemas/Priority" },
          deadline: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Deadline in ISO 8601 format. Null if none was detected.",
            example: "2026-06-15T18:00:00.000Z",
          },
          status: { $ref: "#/components/schemas/TaskStatus" },
          source: {
            type: "string",
            description: "How the task was created. Either 'manual' (user-created) or 'email' (auto-created from an analyzed email).",
            example: "email",
          },
          createdAt: { type: "string", format: "date-time", example: "2026-06-07T10:30:00.000Z" },
          userId: { type: "string", description: "ID of the user who owns this task.", example: "cluser456" },
          emailId: {
            type: "string",
            nullable: true,
            description: "ID of the linked email record if this task was auto-created. Null for manual tasks.",
            example: "clemail789",
          },
          email: {
            $ref: "#/components/schemas/Email",
            nullable: true,
            description: "The linked email object, included when the task was auto-created from an email.",
          },
        },
      },
      Email: {
        type: "object",
        properties: {
          id: { type: "string", example: "clemail789" },
          gmailId: { type: "string", description: "Original Gmail message ID.", example: "18f7c82d9ab1234" },
          from: { type: "string", description: "Sender email address.", example: "billing@acmecorp.com" },
          subject: { type: "string", example: "Invoice #1042 - June 2026" },
          summary: {
            type: "string",
            description: "AI-generated 1-2 sentence summary of the email.",
            example: "Acme Corp sent invoice #1042 for $4,200 due June 15. Action required to confirm receipt.",
          },
          priority: { $ref: "#/components/schemas/Priority" },
          category: { $ref: "#/components/schemas/Category" },
          hasAction: {
            type: "boolean",
            description: "Whether the AI determined this email needs a reply or follow-up.",
            example: true,
          },
          deadline: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Deadline extracted by AI from the email body.",
            example: "2026-06-15T18:00:00.000Z",
          },
          rawSnippet: {
            type: "string",
            description: "Raw Gmail snippet (first ~150 characters of the email).",
            example: "Dear Samin, please find attached invoice #1042 for services rendered in June...",
          },
          processedAt: {
            type: "string",
            format: "date-time",
            description: "When Taskmail processed and analyzed this email.",
            example: "2026-06-07T09:05:12.000Z",
          },
          userId: { type: "string", example: "cluser456" },
        },
      },
      Briefing: {
        type: "object",
        properties: {
          id: { type: "string", example: "clbrief001" },
          date: { type: "string", format: "date-time", example: "2026-06-07T06:00:00.000Z" },
          content: {
            type: "object",
            description: "Structured briefing payload generated by Gemini AI.",
            properties: {
              greeting: {
                type: "string",
                example: "Good morning, Samin. You have 3 urgent items to tackle today.",
              },
              criticalAlertsCount: { type: "integer", example: 2 },
              tasksDueToday: {
                type: "array",
                items: { type: "string" },
                example: ["Reply to Acme Corp invoice", "Submit Q2 report to legal"],
              },
              importantEmailsSummary: {
                type: "array",
                items: { type: "string" },
                example: [
                  "Acme Corp sent invoice #1042 for $4,200 due June 15.",
                  "Legal team flagged the partnership contract for your review.",
                ],
              },
              aiRecommendations: {
                type: "array",
                items: { type: "string" },
                example: [
                  "Start with the Acme invoice - deadline is today at 6 PM.",
                  "Block 30 minutes this afternoon to review the legal contract.",
                ],
              },
            },
          },
          userId: { type: "string", example: "cluser456" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string", example: "Unauthorized" },
        },
      },
    },
  },
  security: [{ sessionCookie: [] }],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        description:
          "Returns the current health status of the Hono API server. Use this to verify the service is running before making other requests.",
        security: [],
        responses: {
          "200": {
            description: "Server is healthy and running.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "healthy" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/gmail/status": {
      get: {
        tags: ["Gmail"],
        summary: "Get Gmail watch status",
        description:
          "Returns whether the authenticated user currently has an active Gmail inbox watch subscription. Gmail watch subscriptions expire every 7 days and must be renewed. Use this endpoint to check before calling POST /api/gmail/watch.",
        responses: {
          "200": {
            description: "Watch status returned successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    watchExpiry: {
                      type: "string",
                      format: "date-time",
                      nullable: true,
                      description: "Expiry date of the current watch. Null if no watch is registered.",
                      example: "2026-06-14T10:00:00.000Z",
                    },
                    isWatched: {
                      type: "boolean",
                      description: "True if the watch is still active (expiry is in the future).",
                      example: true,
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Not authenticated. Sign in via the web app first.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/gmail/watch": {
      post: {
        tags: ["Gmail"],
        summary: "Start Gmail inbox watch",
        description:
          "Registers a Gmail push notification subscription for the authenticated user's inbox. Once active, Google will send a Pub/Sub notification to POST /api/gmail/webhook whenever a new email arrives. The watch expires after 7 days - call this endpoint again to renew it.",
        responses: {
          "200": {
            description: "Watch registered successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Inbox watch started successfully" },
                    watchExpiry: {
                      type: "string",
                      format: "date-time",
                      nullable: true,
                      example: "2026-06-14T10:00:00.000Z",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "500": {
            description: "Failed to register the Gmail watch. Check that GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, PUBSUB_PROJECT_ID, and PUBSUB_TOPIC_NAME are configured correctly.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/gmail/webhook": {
      post: {
        tags: ["Gmail"],
        summary: "Google Pub/Sub webhook receiver",
        description:
          "This endpoint is called by Google Pub/Sub whenever a new email arrives in a watched inbox. It is NOT for direct user calls. The payload is a base64-encoded Pub/Sub message containing the user's email address and a history ID. Taskmail decodes this, looks up the user, fetches new emails from Gmail, runs them through Gemini for analysis, saves the results, and auto-creates tasks if needed.\n\nFor local development, use localtunnel to expose port 3001 and set this URL as your Pub/Sub push subscription endpoint.",
        security: [],
        parameters: [
          {
            name: "secret",
            in: "query",
            description:
              "Webhook secret token for validation. Must match the WEBHOOK_SECRET environment variable.",
            required: false,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "object",
                    properties: {
                      data: {
                        type: "string",
                        description:
                          "Base64-encoded JSON string. When decoded, contains `{ emailAddress: string, historyId: number }`.",
                        example: "eyJlbWFpbEFkZHJlc3MiOiJ0ZXN0QGdtYWlsLmNvbSIsImhpc3RvcnlJZCI6MTIzfQ==",
                      },
                      messageId: { type: "string", example: "123456789" },
                    },
                  },
                  subscription: { type: "string", example: "projects/my-project/subscriptions/gmail-sub" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Webhook received and processing triggered in the background.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    processed: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - missing message or data field in the payload.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "401": {
            description: "Webhook secret mismatch.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "500": {
            description: "Internal error while processing the webhook payload.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/tasks": {
      get: {
        tags: ["Tasks"],
        summary: "List all tasks",
        description:
          "Returns all tasks belonging to the authenticated user. Supports filtering by status and priority. Results are ordered by creation date (newest first). Each task includes the linked email record when the task was auto-created.",
        parameters: [
          {
            name: "status",
            in: "query",
            description: "Filter tasks by status.",
            required: false,
            schema: { $ref: "#/components/schemas/TaskStatus" },
          },
          {
            name: "priority",
            in: "query",
            description: "Filter tasks by priority.",
            required: false,
            schema: { $ref: "#/components/schemas/Priority" },
          },
        ],
        responses: {
          "200": {
            description: "List of tasks returned successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Task" },
                },
              },
            },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "500": {
            description: "Database error while fetching tasks.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
      post: {
        tags: ["Tasks"],
        summary: "Create a manual task",
        description:
          "Creates a new task manually for the authenticated user. Use this when you want to add a task without it being linked to any email. The task source will be set to 'manual'. To let AI suggest the fields before creating, call POST /api/tasks/suggest first.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title: {
                    type: "string",
                    description: "Short, actionable title for the task.",
                    example: "Send project update to client",
                  },
                  description: {
                    type: "string",
                    description: "Optional longer description of what needs to be done.",
                    example: "Write a 3-paragraph update covering progress, blockers, and next steps.",
                  },
                  priority: {
                    $ref: "#/components/schemas/Priority",
                    description: "Priority level. Defaults to MEDIUM if not provided.",
                  },
                  deadline: {
                    type: "string",
                    format: "date-time",
                    nullable: true,
                    description: "Optional deadline in ISO 8601 format.",
                    example: "2026-06-15T18:00:00.000Z",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Task created successfully.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Task" },
              },
            },
          },
          "400": {
            description: "Missing required field - title is required.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "500": {
            description: "Database error while creating the task.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/tasks/suggest": {
      post: {
        tags: ["Tasks"],
        summary: "AI-suggest task fields from free text",
        description:
          "Pass a rough description of what you want to do and Gemini AI will return a structured task suggestion - with a clean title, detailed description, suggested priority, and an optional deadline. Use this in the 'Create Task' dialog before actually saving the task.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["text"],
                properties: {
                  text: {
                    type: "string",
                    description: "Free-form description of the task in your own words.",
                    example: "need to reply to john about the contract by end of this week",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "AI suggestion returned successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: {
                      type: "string",
                      example: "Reply to John regarding the partnership contract",
                    },
                    description: {
                      type: "string",
                      example:
                        "Review John's latest draft, note any concerns, and send a formal reply confirming next steps before Friday EOD.",
                    },
                    priority: { $ref: "#/components/schemas/Priority" },
                    deadline: {
                      type: "string",
                      format: "date-time",
                      nullable: true,
                      example: "2026-06-13T17:00:00.000Z",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Missing or invalid 'text' field in request body.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "500": {
            description: "Gemini API call failed.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/tasks/{id}": {
      patch: {
        tags: ["Tasks"],
        summary: "Update a task",
        description:
          "Updates one or more fields of an existing task. Only fields provided in the request body will be changed - all other fields remain unchanged. Useful for updating task status as work progresses, changing the priority, or adding a description.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "The unique ID of the task to update.",
            schema: { type: "string", example: "clxyz123" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string", example: "Reply to updated invoice from Acme Corp" },
                  description: { type: "string", example: "Updated description with more context." },
                  priority: { $ref: "#/components/schemas/Priority" },
                  deadline: {
                    type: "string",
                    format: "date-time",
                    nullable: true,
                    example: "2026-06-20T12:00:00.000Z",
                  },
                  status: { $ref: "#/components/schemas/TaskStatus" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Task updated successfully. Returns the updated task object.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Task" },
              },
            },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "404": {
            description: "Task not found or does not belong to the authenticated user.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "500": {
            description: "Database error while updating the task.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
      delete: {
        tags: ["Tasks"],
        summary: "Delete a task",
        description:
          "Permanently deletes a task. This action cannot be undone. If the task was linked to an email, the email record is NOT deleted - only the task relationship is removed.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "The unique ID of the task to delete.",
            schema: { type: "string", example: "clxyz123" },
          },
        ],
        responses: {
          "200": {
            description: "Task deleted successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "404": {
            description: "Task not found or does not belong to the authenticated user.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "500": {
            description: "Database error while deleting the task.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/emails": {
      get: {
        tags: ["Emails"],
        summary: "List analyzed emails",
        description:
          "Returns all emails that have been processed by the Taskmail AI pipeline for the authenticated user. Supports filtering by priority, category, and whether action was required. Results are ordered by processing date (newest first). Each email includes the associated task if one was auto-created.",
        parameters: [
          {
            name: "priority",
            in: "query",
            description: "Filter by email priority level.",
            required: false,
            schema: { $ref: "#/components/schemas/Priority" },
          },
          {
            name: "category",
            in: "query",
            description: "Filter by email category.",
            required: false,
            schema: { $ref: "#/components/schemas/Category" },
          },
          {
            name: "hasAction",
            in: "query",
            description: "Filter to only emails that required action (true) or did not (false).",
            required: false,
            schema: { type: "string", enum: ["true", "false"] },
          },
        ],
        responses: {
          "200": {
            description: "List of analyzed emails returned successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Email" },
                },
              },
            },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "500": {
            description: "Database error while fetching emails.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/emails/{id}": {
      get: {
        tags: ["Emails"],
        summary: "Get a single analyzed email",
        description:
          "Returns the full analysis details for a single email, including the AI-generated summary, priority, category, deadline, and any auto-created task.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "The unique Taskmail email record ID (not the Gmail message ID).",
            schema: { type: "string", example: "clemail789" },
          },
        ],
        responses: {
          "200": {
            description: "Email details returned successfully.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Email" },
              },
            },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "404": {
            description: "Email not found or does not belong to the authenticated user.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "500": {
            description: "Database error while fetching email details.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/briefing/today": {
      get: {
        tags: ["Briefing"],
        summary: "Get today's briefing",
        description:
          "Returns the daily briefing for today. If no briefing has been generated yet, one is automatically compiled using the current state of open tasks and emails from the last 24 hours. The briefing content is generated by Gemini AI and includes a greeting, task priorities, email highlights, and actionable recommendations.",
        responses: {
          "200": {
            description: "Today's briefing returned or generated successfully.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Briefing" },
              },
            },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "500": {
            description: "Error fetching or generating the briefing. Check GEMINI_API_KEY configuration.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/briefing/trigger": {
      post: {
        tags: ["Briefing"],
        summary: "Manually trigger briefing generation",
        description:
          "Forces a new briefing to be generated regardless of whether one already exists for today. Useful for refreshing the briefing after a lot of new emails have arrived or tasks have changed. Returns the newly created briefing object.",
        responses: {
          "201": {
            description: "Briefing generated and saved successfully.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Briefing" },
              },
            },
          },
          "401": {
            description: "Not authenticated.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "500": {
            description: "Gemini API call failed or database error while saving the briefing.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
  },
};
