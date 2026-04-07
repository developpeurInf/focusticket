import { User } from "./user";

export type TicketStatus = 'open' | 'in-progress' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketCategory = 'hardware' | 'software' | 'network' | 'access' | 'other';

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  site: string | null;
  equipment: string | null;
  serialNumber: string | null;
  actions: string | null;
  comment: string | null;
  creatorId: string;
  creator?: User;
  createdBy?: string;
  assignedTo?: string | null;
  assigneeId: string | null;
  assignee?: User | null;
  assetId: string | null;
  asset?: any | null;
  createdAt: string;
  dueDate?: string | null;
  resolvedAt: string | null;
  updatedAt: string;
  comments?: Comment[];
}

export interface TicketResponse {
  tickets: Ticket[];
  pagination: {
    total: number;
    pages: number;
    currentPage: number;
    limit: number;
  };
}

export interface SingleTicketResponse {
  ticket: Ticket;
}

export interface Comment {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  createdAt: string;
  user?: User;
}

export interface TicketCreateInput {
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  assetId?: string | null;
  equipment?: string | null;
  serialNumber?: string | null;
  site?: string | null;
  assignedTo?: string | null;
  dueDate?: string | null;
}
