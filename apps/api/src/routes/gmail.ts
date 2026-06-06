import { Hono } from "hono";
import { requireAuth, AuthVariables } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { setupWatch } from "../services/gmail.js";
import { processUserEmailUpdates } from "../services/pubsub.js";

const app = new Hono<{ Variables: AuthVariables }>();

// GET /api/gmail/status -> Get current watch status
app.get("/status", requireAuth, async (c) => {
  const user = c.get("user");
  return c.json({
    watchExpiry: user.watchExpiry,
    isWatched: !!user.watchExpiry && new Date(user.watchExpiry) > new Date(),
  });
});

// POST /api/gmail/watch -> Start watching user's inbox
app.post("/watch", requireAuth, async (c) => {
  const user = c.get("user");

  try {
    const watchResult = await setupWatch(user.id);

    return c.json({
      success: true,
      message: "Inbox watch started successfully",
      watchExpiry: watchResult.watchExpiry,
    });
  } catch (error) {
    console.error("Error setting up Gmail watch:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// POST /api/gmail/webhook -> Endpoint for Google Pub/Sub notifications
// This route is NOT authenticated since Google triggers it.
app.post("/webhook", async (c) => {
  const secret = c.req.query("secret");

  // Validate webhook secret
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();
    console.log("Received Pub/Sub Webhook Payload:", JSON.stringify(body));

    // Webhook message processing logic (Phase 5 & Phase 7)
    // Pub/Sub data is base64 encoded.
    const message = body.message;
    if (!message || !message.data) {
      return c.json({ error: "Bad Request: Missing message or data" }, 400);
    }

    const decodedData = Buffer.from(message.data, "base64").toString("utf-8");
    const parsedData = JSON.parse(decodedData);
    console.log("Decoded Webhook Data:", parsedData);

    const emailAddress = parsedData.emailAddress;
    if (emailAddress) {
      const user = await prisma.user.findUnique({
        where: { email: emailAddress },
      });

      if (user) {
        // Trigger sync process in background so we respond to Pub/Sub instantly (200 OK)
        processUserEmailUpdates(user.id, parsedData.historyId ? String(parsedData.historyId) : undefined)
          .then((res) => console.log(`Async processing finished for ${emailAddress}:`, res))
          .catch((err) => console.error(`Async processing failed for ${emailAddress}:`, err));
      } else {
        console.warn(`Webhook received for email ${emailAddress} but user is not registered in Database`);
      }
    }

    return c.json({ success: true, processed: true });
  } catch (error) {
    console.error("Error processing Pub/Sub webhook:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export default app;
