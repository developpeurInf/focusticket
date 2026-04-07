
import { 
  Ticket, 
  TicketResponse, 
  SingleTicketResponse,
  CommentResponse,
  Comment 
} from "@/types/ticket";
import apiClient from "./apiClient";

// Get tickets with optional filters
export const getTickets = async (filters?: {
  status?: string[];
  priority?: string[];
  category?: string[];
  search?: string;
  userRole?: string;
  userId?: string;
  page?: number;
  limit?: number;
}): Promise<TicketResponse> => {
  try {
    const response = await apiClient.get("/tickets", { params: filters });
    return response.data;
  } catch (error) {
    console.error("Error fetching tickets:", error);
    throw error;
  }
};

// Get a single ticket by ID
export const getTicketById = async (id: string): Promise<SingleTicketResponse> => {
  try {
    const response = await apiClient.get(`/tickets/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ticket ${id}:`, error);
    throw error;
  }
};

// Create a new ticket
export const createTicket = async (ticket: Partial<Ticket>): Promise<Ticket> => {
  try {
    const response = await apiClient.post("/tickets", ticket);
    return response.data.data;
  } catch (error) {
    console.error("Error creating ticket:", error);
    throw error;
  }
};

// Update ticket status
export const updateTicketStatus = async (
  ticketId: string, 
  newStatus: string
): Promise<boolean> => {
  try {
    const response = await apiClient.patch(`/tickets/${ticketId}/status`, { status: newStatus });
    return response.status === 200;
  } catch (error) {
    console.error(`Error updating ticket ${ticketId} status:`, error);
    throw error;
  }
};

// Assign ticket to agent
export const assignTicket = async (
  ticketId: string, 
  agentId: string
): Promise<boolean> => {
  try {
    const response = await apiClient.patch(`/tickets/${ticketId}/assign`, { agentId });
    return response.status === 200;
  } catch (error) {
    console.error(`Error assigning ticket ${ticketId}:`, error);
    throw error;
  }
};

// Get comments for a ticket
export const getTicketComments = async (ticketId: string): Promise<Comment[]> => {
  try {
    const response = await apiClient.get(`/tickets/${ticketId}/comments`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching comments for ticket ${ticketId}:`, error);
    throw error;
  }
};

// Add a comment to a ticket
export const addTicketComment = async (ticketId: string, content: string): Promise<Comment> => {
  try {
    const response = await apiClient.post(`/tickets/${ticketId}/comments`, { content });
    return response.data.data;
  } catch (error) {
    console.error(`Error adding comment to ticket ${ticketId}:`, error);
    throw error;
  }
};

// Export tickets data (to PDF or Excel)
export const exportTickets = async (
  format: 'pdf' | 'excel',
  filters?: object
): Promise<Blob> => {
  try {
    const response = await apiClient.get(`/tickets/export/${format}`, {
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error(`Error exporting tickets in ${format} format:`, error);
    throw error;
  }
};
