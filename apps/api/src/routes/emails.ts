import { Hono } from "hono";
import { requireAuth, AuthVariables } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

const app = new Hono<{ Variables: AuthVariables }>();

// All email routes require authentication
app.use("*", requireAuth);

// GET /api/emails -> List analyzed emails with filters
app.get("/", async (c) => {
  const user = c.get("user");
  const { priority, category, hasAction } = c.req.query();

  try {
    const emails = await prisma.email.findMany({
      where: {
        userId: user.id,
        ...(priority ? { priority: priority as any } : {}),
        ...(category ? { category: category as any } : {}),
        ...(hasAction !== undefined ? { hasAction: hasAction === "true" } : {}),
      },
      orderBy: {
        processedAt: "desc",
      },
      include: {
        task: true,
      },
    });

    return c.json(emails);
  } catch (error) {
    console.error("Error fetching emails:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// GET /api/emails/:id -> Get single email details
app.get("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  try {
    const email = await prisma.email.findFirst({
      where: { id, userId: user.id },
      include: {
        task: true,
      },
    });

    if (!email) {
      return c.json({ error: "Email not found" }, 404);
    }

    return c.json(email);
  } catch (error) {
    console.error("Error fetching email details:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export default app;
