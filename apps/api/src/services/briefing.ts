import { prisma } from "../lib/prisma.js";
import { generateDailyBriefing } from "./gemini.js";

/**
 * Gather open tasks and recent emails, send them to Gemini, and save the briefing in the database.
 */
export async function compileDailyBriefing(userId: string) {
  console.log(`Compiling daily briefing for user: ${userId}`);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // 1. Get open tasks
    const openTasks = await prisma.task.findMany({
      where: {
        userId,
        status: {
          in: ["OPEN", "IN_PROGRESS"],
        },
      },
      select: {
        title: true,
        priority: true,
        deadline: true,
      },
    });

    // 2. Get recent emails processed in the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const recentEmails = await prisma.email.findMany({
      where: {
        userId,
        processedAt: {
          gte: oneDayAgo,
        },
      },
      select: {
        subject: true,
        from: true,
        summary: true,
        priority: true,
      },
    });

    // 3. Compile briefing using Gemini AI
    const userName = user.name || user.email.split("@")[0];
    const briefingContent = await generateDailyBriefing(
      userName,
      openTasks as any,
      recentEmails as any
    );

    // 4. Save briefing to DB
    const savedBriefing = await prisma.briefing.create({
      data: {
        userId,
        content: briefingContent as any,
      },
    });

    console.log(`Successfully compiled and saved briefing ID: ${savedBriefing.id}`);
    return savedBriefing;
  } catch (error) {
    console.error(`Error compiling briefing for user ${userId}:`, error);
    throw error;
  }
}
