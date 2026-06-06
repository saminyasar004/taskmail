import { Hono } from "hono";
import { requireAuth, AuthVariables } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { suggestTaskFields } from "../services/gemini.js";

const app = new Hono<{ Variables: AuthVariables }>();

// All task routes require authentication
app.use("*", requireAuth);

// GET /api/tasks -> List all tasks
app.get("/", async (c) => {
  const user = c.get("user");
  const { status, priority } = c.req.query();

  try {
    const tasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        ...(status ? { status: status as any } : {}),
        ...(priority ? { priority: priority as any } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        email: true,
      },
    });

    return c.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// POST /api/tasks/suggest -> AI suggests task fields from free-text
app.post("/suggest", async (c) => {
  try {
    const { text } = await c.req.json();
    if (!text || typeof text !== "string") {
      return c.json({ error: "text is required" }, 400);
    }
    const suggestion = await suggestTaskFields(text);
    return c.json(suggestion);
  } catch (error) {
    console.error("Error calling task suggestion AI:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// POST /api/tasks -> Create manual task
app.post("/", async (c) => {
  const user = c.get("user");
  try {
    const { title, description, priority, deadline } = await c.req.json();

    if (!title) {
      return c.json({ error: "Title is required" }, 400);
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || "MEDIUM",
        deadline: deadline ? new Date(deadline) : null,
        source: "manual",
        userId: user.id,
      },
    });

    return c.json(task, 201);
  } catch (error) {
    console.error("Error creating task:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// PATCH /api/tasks/:id -> Update task status or fields
app.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  try {
    const body = await c.req.json();
    const { title, description, priority, deadline, status } = body;

    // Check ownership
    const existingTask = await prisma.task.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingTask) {
      return c.json({ error: "Task not found" }, 404);
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
        ...(status !== undefined ? { status } : {}),
      },
    });

    return c.json(updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// DELETE /api/tasks/:id -> Delete task
app.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  try {
    // Check ownership
    const existingTask = await prisma.task.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingTask) {
      return c.json({ error: "Task not found" }, 404);
    }

    await prisma.task.delete({
      where: { id },
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export default app;
