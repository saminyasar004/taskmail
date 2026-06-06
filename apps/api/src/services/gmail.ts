import { google } from "googleapis";
import { prisma } from "../lib/prisma.js";

/**
 * Instantiate and return a Google OAuth2 Client configured with user credentials.
 * Handles token refreshes and updates the database automatically.
 */
export async function getGmailClient(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error(`User with ID ${userId} not found`);
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: user.accessToken,
    refresh_token: user.refreshToken,
  });

  // Automatically update the access token in database when refreshed
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      console.log(`Auto-refreshed Google access token for user: ${user.email}`);
      await prisma.user.update({
        where: { id: userId },
        data: {
          accessToken: tokens.access_token,
        },
      });
    }
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

/**
 * Configure Gmail users.watch to push notifications to Google Pub/Sub topic.
 */
export async function setupWatch(userId: string) {
  const gmail = await getGmailClient(userId);

  const topicName = `projects/${process.env.PUBSUB_PROJECT_ID}/topics/${process.env.PUBSUB_TOPIC_NAME}`;

  try {
    const res = await gmail.users.watch({
      userId: "me",
      requestBody: {
        topicName,
        labelIds: ["INBOX"],
      },
    });

    const expiration = res.data.expiration; // String representing epoch time in ms
    let watchExpiry: Date | null = null;

    if (expiration) {
      watchExpiry = new Date(Number(expiration));
      await prisma.user.update({
        where: { id: userId },
        data: { watchExpiry },
      });
    }

    return {
      success: true,
      watchExpiry,
      historyId: res.data.historyId,
    };
  } catch (error) {
    console.error(`Failed to register Gmail watch for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Helper to extract email body content (plain text or html) from the Gmail API response payload.
 */
function getBodyText(payload: any): string {
  let body = "";

  if (payload.body && payload.body.data) {
    body = Buffer.from(payload.body.data, "base64").toString("utf-8");
  } else if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body && part.body.data) {
        body += Buffer.from(part.body.data, "base64").toString("utf-8");
      } else if (part.mimeType === "text/html" && part.body && part.body.data) {
        // Fallback to HTML body (and clean tags if needed)
        body += Buffer.from(part.body.data, "base64").toString("utf-8");
      } else if (part.parts) {
        body += getBodyText(part);
      }
    }
  }

  // Remove HTML tags if present (basic regex cleanup)
  return body.replace(/<[^>]*>?/gm, "").trim();
}

export interface ParsedEmail {
  gmailId: string;
  from: string;
  subject: string;
  date: Date;
  snippet: string;
  body: string;
}

/**
 * Fetch messages matching criteria, or fetch history changes since startHistoryId
 */
export async function fetchNewEmails(
  userId: string,
  startHistoryId?: string
): Promise<ParsedEmail[]> {
  const gmail = await getGmailClient(userId);
  let messageIds: string[] = [];

  try {
    if (startHistoryId) {
      // Fetch history updates
      const historyRes = await gmail.users.history.list({
        userId: "me",
        startHistoryId: startHistoryId,
        historyTypes: ["messageAdded"],
      });

      const histories = historyRes.data.history;
      if (histories) {
        for (const history of histories) {
          if (history.messagesAdded) {
            for (const msgAdded of history.messagesAdded) {
              if (msgAdded.message && msgAdded.message.id) {
                messageIds.push(msgAdded.message.id);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn("Gmail history.list failed or expired. Falling back to query inbox list.", error);
  }

  // Fallback: If no messages retrieved via history, grab recent unread inbox emails
  if (messageIds.length === 0) {
    try {
      const listRes = await gmail.users.messages.list({
        userId: "me",
        q: "is:unread",
        maxResults: 15,
      });

      const messages = listRes.data.messages;
      if (messages) {
        messageIds = messages.map((m) => m.id).filter(Boolean) as string[];
      }
    } catch (error) {
      console.error("Failed to query Gmail messages.list:", error);
    }
  }

  // Deduplicate message IDs
  const uniqueMessageIds = [...new Set(messageIds)];
  const parsedEmails: ParsedEmail[] = [];

  for (const msgId of uniqueMessageIds) {
    // Check if we already processed this email
    const emailExists = await prisma.email.findUnique({
      where: { gmailId: msgId },
    });

    if (emailExists) {
      continue;
    }

    try {
      const msgRes = await gmail.users.messages.get({
        userId: "me",
        id: msgId,
        format: "full",
      });

      const payload = msgRes.data.payload;
      if (!payload) continue;

      const headers = payload.headers || [];
      const fromHeader = headers.find((h) => h.name?.toLowerCase() === "from")?.value || "Unknown Sender";
      const subjectHeader = headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "No Subject";
      const dateHeader = headers.find((h) => h.name?.toLowerCase() === "date")?.value;

      const date = dateHeader ? new Date(dateHeader) : new Date();
      const body = getBodyText(payload);
      const snippet = msgRes.data.snippet || "";

      parsedEmails.push({
        gmailId: msgId,
        from: fromHeader,
        subject: subjectHeader,
        date,
        snippet,
        body: body || snippet, // Fallback to snippet if body is empty
      });
    } catch (error) {
      console.error(`Failed to fetch message details for ID ${msgId}:`, error);
    }
  }

  return parsedEmails;
}
