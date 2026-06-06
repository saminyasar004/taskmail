import { Hono } from "hono";
import { requireAuth, AuthVariables } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { compileDailyBriefing } from "../services/briefing.js";

const app = new Hono<{ Variables: AuthVariables }>();

// All briefing routes require authentication
app.use("*", requireAuth);

// GET /api/briefing/today -> Get today's briefing, generating it if it doesn't exist
app.get("/today", async (c) => {
  const user = c.get("user");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Look for a briefing generated today
    let briefing = await prisma.briefing.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: today,
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    if (!briefing) {
      // Generate briefing on-the-fly if missing
      briefing = await compileDailyBriefing(user.id);
    }

    return c.json(briefing);
  } catch (error) {
    console.error("Error fetching today's briefing:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// POST /api/briefing/trigger -> Manually trigger briefing generation
app.post("/trigger", async (c) => {
  const user = c.get("user");

  try {
    const briefing = await compileDailyBriefing(user.id);
    return c.json(briefing, 201);
  } catch (error) {
    console.error("Error triggering briefing generation:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export default app;
