import { Ticket } from "@/types/ticket";
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
        comment: t.comment || "",
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

export const exportTickets = async (format: 'pdf' | 'excel', filters?: any): Promise<void> => {
  if (format === 'excel') {
    try {
      const XLSX = await import('xlsx');
      // On récupère TOUS les tickets pour l'export (on met une limite haute)
      const res = await getTickets({ ...filters, limit: 10000 });
      const data = res.tickets.map(t => ({
        "N° Ticket": t.ticketNumber,
        "Titre": t.subject,
        "Statut": t.status,
        "Priorité": t.priority,
        "Demandeur": t.createdBy,
        "Intervenant": t.assignedTo,
        "Équipement": t.equipment,
        "S/N": t.serialNumber,
        "Site": t.site,
        "Actions": t.actions,
        "Date Ouverture": new Date(t.createdAt).toLocaleDateString('fr-FR'),
        "Date Résolution": t.resolvedAt ? new Date(t.resolvedAt).toLocaleDateString('fr-FR') : "-"
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tickets");
      XLSX.writeFile(wb, `export_tickets_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error("Export Excel failed", err);
    }
  }
};
