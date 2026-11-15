import { TicketStatus } from "@/types/ticket";

// Statuts de ticket gérés par l'application, dans l'ordre d'affichage
export const TICKET_STATUSES: TicketStatus[] = ["open", "closed", "archived"];

export const TICKET_STATUS_CONFIG: Record<TicketStatus, { label: string; badgeClass: string; dotClass: string }> = {
  open: {
    label: "Ouvert",
    badgeClass: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
    dotClass: "bg-sky-500",
  },
  "in-progress": {
    label: "En cours",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    dotClass: "bg-amber-500",
  },
  closed: {
    label: "Clôturé",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
    dotClass: "bg-emerald-500",
  },
  archived: {
    label: "Archivé",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
    dotClass: "bg-slate-500",
  },
};

// Ramène les anciennes valeurs (françaises, "resolved"...) vers un statut connu
export function normalizeTicketStatus(status: string | null | undefined): TicketStatus {
  const s = String(status || "").trim().toLowerCase();
  if (["closed", "resolved", "résolu", "resolu", "clos", "clôturé", "cloturé"].includes(s)) return "closed";
  if (["archived", "archivé", "archive", "archivé(e)"].includes(s)) return "archived";
  if (["in-progress", "en cours", "en-cours"].includes(s)) return "in-progress";
  return "open";
}

export function getTicketStatusConfig(status: string | null | undefined) {
  return TICKET_STATUS_CONFIG[normalizeTicketStatus(status)];
}

export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  critical: "Critique",
};

export const TICKET_CATEGORY_LABELS: Record<string, string> = {
  hardware: "Matériel",
  software: "Logiciel",
  network: "Réseau",
  access: "Accès",
  other: "Autre",
};
