import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// Define JSON schema for email analysis
const emailAnalysisSchema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: {
      type: SchemaType.STRING,
      description: "A short, clear 1-2 sentence summary of the email.",
    },
    priority: {
      type: SchemaType.STRING,
      enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"],
      description: "Priority of the email based on urgency, sender, and action requested.",
    },
    category: {
      type: SchemaType.STRING,
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
      description: "Best category fit for this email content.",
    },
    hasAction: {
      type: SchemaType.BOOLEAN,
      description: "Whether the email demands a reply, follow-up, or task from the user.",
    },
    deadline: {
      type: SchemaType.STRING,
      description: "ISO Date String (e.g. 2026-06-15T18:00:00Z) representing an explicit or implicit deadline found in the email. Leave null or empty string if none.",
    },
    suggestedTask: {
      type: SchemaType.OBJECT,
      properties: {
        title: {
          type: SchemaType.STRING,
          description: "Suggested title for the created task. Action-oriented, e.g. 'Review Partnership Proposal from X'.",
        },
        description: {
          type: SchemaType.STRING,
          description: "Details of what needs to be done, listing bullet points of actions requested in the email.",
        },
      },
      required: ["title", "description"],
    },
  },
  required: ["summary", "priority", "category", "hasAction"],
};

export interface EmailAnalysisResult {
  summary: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";
  category:
    | "CLIENT_REQUEST"
    | "SALES"
    | "INVOICE"
    | "INTERNAL"
    | "PARTNERSHIP"
    | "LEGAL"
    | "SUPPORT"
    | "ADMIN"
    | "OTHER";
  hasAction: boolean;
  deadline?: string | null;
  suggestedTask?: {
    title: string;
    description: string;
  } | null;
}

/**
 * Send email content through Gemini to classify priority, category, action items, and deadline.
 */
export async function analyzeEmail(
  subject: string,
  from: string,
  body: string,
  date: Date
): Promise<EmailAnalysisResult> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured");
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: emailAnalysisSchema as any,
    },
    systemInstruction:
      "You are Taskmail's Email Intelligence AI. Analyze the email details provided and extract structured information according to the JSON schema. Be highly precise in detecting deadlines and whether a response or action is required from the user.",
  });

  const prompt = `
    Email Received Date: ${date.toISOString()}
    From: ${from}
    Subject: ${subject}
    Body Content:
    ---
    ${body}
    ---
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text) as EmailAnalysisResult;
  } catch (error) {
    console.error("Gemini email analysis failed:", error);
    // Return fallback safe response
    return {
      summary: `Email from ${from} regarding "${subject}".`,
      priority: "MEDIUM",
      category: "OTHER",
      hasAction: false,
      deadline: null,
      suggestedTask: null,
    };
  }
}

// Define JSON schema for daily briefings
const dailyBriefingSchema = {
  type: SchemaType.OBJECT,
  properties: {
    greeting: {
      type: SchemaType.STRING,
      description: "Warm, professional greeting addressing the user, summarizing the vibe of the day.",
    },
    criticalAlertsCount: {
      type: SchemaType.INTEGER,
      description: "Count of critical tasks or emails requiring immediate attention today.",
    },
    tasksDueToday: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "List of task titles that have deadlines today.",
    },
    importantEmailsSummary: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "1-sentence summaries of the most important emails received in the last 24 hours.",
    },
    aiRecommendations: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Actionable AI suggestions on how the user should order their day (e.g. 'Answer Client Y regarding invoices first').",
    },
  },
  required: ["greeting", "criticalAlertsCount", "tasksDueToday", "importantEmailsSummary", "aiRecommendations"],
};

export interface DailyBriefingResult {
  greeting: string;
  criticalAlertsCount: number;
  tasksDueToday: string[];
  importantEmailsSummary: string[];
  aiRecommendations: string[];
}

/**
 * Generate a personalized briefing from the user's open tasks and recent email logs.
 */
export async function generateDailyBriefing(
  userName: string,
  openTasks: Array<{ title: string; priority: string; deadline: Date | null }>,
  recentEmails: Array<{ subject: string; from: string; summary: string; priority: string }>
): Promise<DailyBriefingResult> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured");
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: dailyBriefingSchema as any,
    },
    systemInstruction:
      "You are a premium virtual chief of staff. Analyze the user's tasks and recent emails, and create a beautiful, concise daily briefing helping them prioritize and start their day efficiently.",
  });

  const prompt = `
    User Name: ${userName}
    Current Local Time: ${new Date().toISOString()}

    Open Tasks:
    ${JSON.stringify(openTasks, null, 2)}

    Recent Emails Processed (Last 24 Hours):
    ${JSON.stringify(recentEmails, null, 2)}
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text) as DailyBriefingResult;
  } catch (error) {
    console.error("Gemini daily briefing generation failed:", error);
    return {
      greeting: `Good morning, ${userName}. Here is your briefing.`,
      criticalAlertsCount: 0,
      tasksDueToday: [],
      importantEmailsSummary: [],
      aiRecommendations: ["Check your tasks dashboard to review outstanding items."],
    };
  }
}

// Define JSON schema for manual task suggestion
const taskSuggestionSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description: "Concise, actionable task title, e.g., 'Prepare slides for Q3 sales meeting'.",
    },
    description: {
      type: SchemaType.STRING,
      description: "Bullet points detailing the sub-steps to perform based on context.",
    },
    priority: {
      type: SchemaType.STRING,
      enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"],
      description: "Suggested priority based on details and urgency.",
    },
    deadline: {
      type: SchemaType.STRING,
      description: "Suggested ISO deadline string if mentioned, otherwise leave null or empty.",
    },
  },
  required: ["title", "description", "priority"],
};

export interface TaskSuggestionResult {
  title: string;
  description: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";
  deadline?: string | null;
}

/**
 * Take a rough description of a task, send it to Gemini, and return parsed suggestion parameters.
 */
export async function suggestTaskFields(text: string): Promise<TaskSuggestionResult> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured");
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: taskSuggestionSchema as any,
    },
    systemInstruction:
      "You are a helpful task organizer. Analyze the user's rough thoughts or requests and structure them into a formal actionable task with suggested title, description, priority, and deadline.",
  });

  try {
    const result = await model.generateContent(`Analyze this task request: "${text}"`);
    const responseText = result.response.text();
    return JSON.parse(responseText) as TaskSuggestionResult;
  } catch (error) {
    console.error("Gemini task suggestion failed:", error);
    return {
      title: text.substring(0, 50),
      description: text,
      priority: "MEDIUM",
      deadline: null,
    };
  }
}

