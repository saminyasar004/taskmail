import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { swaggerUI } from "@hono/swagger-ui";
import "dotenv/config";

// Route imports
import gmailRoutes from "./routes/gmail.js";
import taskRoutes from "./routes/tasks.js";
import emailRoutes from "./routes/emails.js";
import briefingRoutes from "./routes/briefing.js";
import { openApiSpec } from "./lib/openapi.js";

const app = new Hono();

// Global middlewares
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => {
      // In development the Next.js proxy handles cross-origin, but we still
      // need to whitelist localhost:3000 for direct calls during testing.
      return origin || "http://localhost:3000";
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposeHeaders: ["Set-Cookie"],
  })
);

// Health check
app.get("/health", (c) => {
  return c.json({ status: "healthy", timestamp: new Date() });
});

// Swagger UI at /api/docs
// Serves the full interactive API documentation for all Taskmail endpoints.
app.get(
  "/api/docs",
  swaggerUI({ url: "/api/docs/spec.json" })
);

// OpenAPI spec JSON endpoint
app.get("/api/docs/spec.json", (c) => {
  return c.json(openApiSpec);
});

// Application routes
app.route("/api/gmail", gmailRoutes);
app.route("/api/tasks", taskRoutes);
app.route("/api/emails", emailRoutes);
app.route("/api/briefing", briefingRoutes);

// Global error handler
app.onError((err, c) => {
  console.error("Unhandled server error:", err);
  return c.json({ error: "Internal Server Error", message: err.message }, 500);
});

app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

const port = Number(process.env.PORT) || 3001;

console.log(`Hono server starting on port ${port}`);
console.log(`Swagger UI available at http://localhost:${port}/api/docs`);

serve({
  fetch: app.fetch,
  port,
});
