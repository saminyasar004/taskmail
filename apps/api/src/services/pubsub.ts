import { fetchNewEmails } from "./gmail.js";
import { analyzeEmail } from "./gemini.js";
import { prisma } from "../lib/prisma.js";

/**
 * Fetch and process new emails for a user.
 * Sends raw email text to Gemini, saves the Email analysis, and auto-creates Tasks if necessary.
 */
export async function processUserEmailUpdates(userId: string, startHistoryId?: string) {
  console.log(`Starting email sync and analysis pipeline for user: ${userId}`);

  try {
    // 1. Fetch raw messages from Gmail API since last checkpoint
    const newEmails = await fetchNewEmails(userId, startHistoryId);
    console.log(`Retrieved ${newEmails.length} new un-processed emails for user: ${userId}`);

    let emailsParsed = 0;
    let tasksCreated = 0;

    for (const email of newEmails) {
      try {
        console.log(`Analyzing email [${email.gmailId}] - Subject: "${email.subject}"`);

        // 2. Feed body and details to Gemini
        const analysis = await analyzeEmail(
          email.subject,
          email.from,
          email.body,
          email.date
        );

        // 3. Save Email record in database
        const savedEmail = await prisma.email.create({
          data: {
            gmailId: email.gmailId,
            from: email.from,
            subject: email.subject,
            summary: analysis.summary,
            priority: analysis.priority,
            category: analysis.category,
            hasAction: analysis.hasAction,
            deadline: analysis.deadline ? new Date(analysis.deadline) : null,
            rawSnippet: email.snippet,
            userId,
          },
        });

        emailsParsed++;

        // 4. If action required, create linked task
        if (analysis.hasAction && analysis.suggestedTask) {
          await prisma.task.create({
            data: {
              title: analysis.suggestedTask.title,
              description: analysis.suggestedTask.description,
              priority: analysis.priority,
              deadline: analysis.deadline ? new Date(analysis.deadline) : null,
              status: "OPEN",
              source: "email",
              userId,
              emailId: savedEmail.id,
            },
          });

          tasksCreated++;
          console.log(`Auto-created task: "${analysis.suggestedTask.title}" linked to email ID: ${savedEmail.id}`);
        }
      } catch (error) {
        console.error(`Error processing email ${email.gmailId}:`, error);
      }
    }

    console.log(`Completed email pipeline for user ${userId}. Processed ${emailsParsed} emails. Created ${tasksCreated} tasks.`);
    return {
      success: true,
      emailsProcessed: emailsParsed,
      tasksCreated,
    };
  } catch (error) {
    console.error(`Failed to process email updates for user ${userId}:`, error);
    throw error;
  }
}
