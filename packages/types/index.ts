export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';

export type Category =
  | 'CLIENT_REQUEST'
  | 'SALES'
  | 'INVOICE'
  | 'INTERNAL'
  | 'PARTNERSHIP'
  | 'LEGAL'
  | 'SUPPORT'
  | 'ADMIN'
  | 'OTHER';

export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'COMPLETED';

export interface UserDTO {
  id: string;
  email: string;
  name: string | null;
  watchExpiry: string | null;
  createdAt: string;
}

export interface EmailDTO {
  id: string;
  gmailId: string;
  from: string;
  subject: string;
  summary: string;
  priority: Priority;
  category: Category;
  hasAction: boolean;
  deadline: string | null;
  rawSnippet: string;
  processedAt: string;
  userId: string;
}

export interface TaskDTO {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  deadline: string | null;
  status: TaskStatus;
  source: string;
  createdAt: string;
  userId: string;
  emailId: string | null;
  email?: EmailDTO | null;
}

export interface BriefingDTO {
  id: string;
  date: string;
  content: {
    greeting?: string;
    criticalAlertsCount?: number;
    tasksDueToday?: string[];
    importantEmailsSummary?: string[];
    aiRecommendations?: string[];
  };
  userId: string;
}
