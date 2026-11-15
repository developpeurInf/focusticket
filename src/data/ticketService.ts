import { Ticket, Intervention } from "@/types/ticket";
import axios from "axios";

const API_URL = `/api`;

export const createTicket = async (ticket: any): Promise<Ticket> => {
  const response = await axios.post(`${API_URL}/tickets`, ticket);
  return response.data;
};

export const updateTicket = async (id: string, data: any): Promise<Ticket> => {
  const response = await axios.put(`${API_URL}/tickets/${id}`, data);
  return response.data;
};

export const deleteTicket = async (id: string): Promise<void> => {
  await axios.delete(`${API_URL}/tickets/${id}`);
};

export const updateTicketStatus = async (ticketId: string, newStatus: string): Promise<boolean> => {
  console.log(`Updating ticket ${ticketId} status to ${newStatus}`);
  // Simulate for now
  return true;
};

export const assignTicket = async (ticketId: string, agentId: string): Promise<boolean> => {
  console.log(`Assigning ticket ${ticketId} to agent ${agentId}`);
  return true;
};

export const getTickets = async (params: { 
  page?: number, 
  limit?: number, 
  search?: string, 
  status?: string[], 
  priority?: string[], 
  category?: string[],
  sortBy?: string,
  sortOrder?: string
} | any = {}): Promise<{ tickets: Ticket[], pagination: any }> => {
  try {
    const response = await axios.get(`${API_URL}/tickets`, { params });
    const tickets = response.data.tickets.map((t: any) => {
      return {
        id: t.id,
        ticketNumber: t.ticketNumber || "R-XXXXXX",
        subject: t.title,
        description: t.description,
        status: t.status || 'open',
        priority: t.priority || 'medium',
        category: t.category || 'other',
        createdAt: t.createdAt,
        createdBy: t.creator ? t.creator.name : (t.createdBy || "Inconnu"),
        assignedTo: t.assignee ? t.assignee.name : (t.assignedTo || null),
        equipment: t.equipment || (t.asset ? (t.asset.produit || t.asset.name) : "-"),
        assetId: t.assetId,
        serialNumber: (t.asset && t.asset.serialNumber) ? t.asset.serialNumber : (t.serialNumber || "-"),
        site: t.site || "-",
        actions: t.actions || "",
        resolvedAt: t.resolvedAt || null,
        updatedAt: t.updatedAt,
        comment: t.comment || "",
        actionPlan: t.actionPlan || "",
        interventionsCount: t._count?.interventions ?? (t.interventions ? t.interventions.length : 0),
        interventions: t.interventions || undefined,
        comments: (t.comments || []).map((c: any) => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt,
          user: c.author // Prisma renvoie 'author', le frontend attend 'user'
        }))
      };
    });
    return { tickets, pagination: response.data.pagination };
  } catch (error) {
    console.error("Erreur API:", error);
    return { tickets: [], pagination: { total: 0, pages: 0, currentPage: 1, limit: 13 } };
  }
};

// Export Excel des tickets filtrés.
// "synthese" : une ligne par ticket ; "detaille" : ajoute l'historique de toutes les interventions.
export const exportTickets = async (
  kind: 'synthese' | 'detaille',
  filters?: any,
  filterLabels: string[] = []
): Promise<string> => {
  const { exportTicketsToExcel } = await import('@/utils/ticketExcelExport');
  // On récupère TOUS les tickets correspondant aux filtres (limite haute), triés par numéro
  const res = await getTickets({
    sortBy: 'ticketNumber',
    sortOrder: 'asc',
    ...filters,
    page: 1,
    limit: 10000,
    // Les interventions servent aux deux versions (résumé de la dernière étape, temps total)
    includeInterventions: 'true',
  });
  return exportTicketsToExcel(res.tickets, kind, filterLabels);
};

export interface TicketFilterOptions {
  statuses: string[];
  sites: string[];
  categories: string[];
  priorities: string[];
  assignees: { id: string; name: string }[];
  creators: { id: string; name: string }[];
}

// Valeurs disponibles pour les filtres de la page Tickets
export const getTicketFilterOptions = async (): Promise<TicketFilterOptions> => {
  const response = await axios.get(`${API_URL}/tickets/filter-options`);
  return response.data;
};

// ===== Interventions (étapes successives d'un ticket) =====

export type InterventionInput = Partial<Pick<Intervention,
  'performedAt' | 'technician' | 'actions' | 'result' | 'nextSteps' | 'durationMinutes' | 'statusAfter'>>;

export const getInterventions = async (ticketId: string): Promise<Intervention[]> => {
  const response = await axios.get(`${API_URL}/tickets/${ticketId}/interventions`);
  return response.data;
};

export const addIntervention = async (ticketId: string, data: InterventionInput): Promise<Intervention> => {
  const response = await axios.post(`${API_URL}/tickets/${ticketId}/interventions`, data);
  return response.data;
};

export const updateIntervention = async (ticketId: string, interventionId: string, data: InterventionInput): Promise<Intervention> => {
  const response = await axios.put(`${API_URL}/tickets/${ticketId}/interventions/${interventionId}`, data);
  return response.data;
};

export const deleteIntervention = async (ticketId: string, interventionId: string): Promise<void> => {
  await axios.delete(`${API_URL}/tickets/${ticketId}/interventions/${interventionId}`);
};
