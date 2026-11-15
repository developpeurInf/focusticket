import type { Workbook, Worksheet, Cell, Fill, Borders } from "exceljs";
import { Ticket, Intervention } from "@/types/ticket";
import {
  getTicketStatusConfig,
  normalizeTicketStatus,
  TICKET_PRIORITY_LABELS,
  TICKET_CATEGORY_LABELS,
} from "@/lib/ticketStatus";

// =====================================================================
// Export Excel des tickets, en deux versions :
//  - "synthese" : une ligne par ticket, toutes les informations
//  - "detaille" : la synthèse + une feuille avec chaque intervention
// =====================================================================

export type TicketExportKind = "synthese" | "detaille";

// ---------- Charte graphique ----------
const COLORS = {
  brand: "1E3A8A",       // bleu nuit (titres, en-têtes)
  brandLight: "DBEAFE",  // bleu très clair
  zebra: "F8FAFC",       // gris très clair (une ligne sur deux)
  border: "CBD5E1",      // gris des bordures
  text: "0F172A",
  muted: "64748B",
  white: "FFFFFF",
  planFill: "EEF2FF",    // indigo très clair (plan d'action)
  planText: "4338CA",
};

const STATUS_COLORS: Record<string, { fill: string; font: string }> = {
  open: { fill: "E0F2FE", font: "075985" },
  "in-progress": { fill: "FEF3C7", font: "92400E" },
  closed: { fill: "D1FAE5", font: "065F46" },
  archived: { fill: "E2E8F0", font: "334155" },
};

const PRIORITY_COLORS: Record<string, { fill: string; font: string }> = {
  low: { fill: "F1F5F9", font: "475569" },
  medium: { fill: "DBEAFE", font: "1E40AF" },
  high: { fill: "FFEDD5", font: "9A3412" },
  critical: { fill: "FEE2E2", font: "991B1B" },
};

const solid = (argb: string): Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb: "FF" + argb } });
const thinBorder = (color = COLORS.border): Partial<Borders> => {
  const side = { style: "thin" as const, color: { argb: "FF" + color } };
  return { top: side, left: side, bottom: side, right: side };
};

// ---------- Libellés français ----------
const statusLabel = (s: string | null | undefined) => getTicketStatusConfig(s).label;
const priorityLabel = (p: string | null | undefined) => TICKET_PRIORITY_LABELS[String(p || "medium").toLowerCase()] ?? p ?? "";
const categoryLabel = (c: string | null | undefined) => (c ? TICKET_CATEGORY_LABELS[c] ?? c : "");
const clean = (v: any) => (v === null || v === undefined || v === "-" || v === "N/A" ? "" : String(v));
const toDate = (v: string | null | undefined) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};
const formatMinutes = (minutes: number) => {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
};
// Résumé de la dernière étape : "Étape 2 · 14/11/2026 · Tech Karim : actions"
const lastInterventionText = (list: Intervention[] | undefined) => {
  if (!list || list.length === 0) return "";
  const last = list[list.length - 1];
  const when = toDate(last.performedAt);
  const head = [`Étape ${last.stepNumber}`, when ? when.toLocaleDateString("fr-FR") : "", technicianNames(last)].filter(Boolean).join(" · ");
  return `${head} : ${clean(last.actions)}`;
};
// Noms des intervenants d'une étape (plusieurs possibles)
const technicianNames = (i: Intervention) =>
  i.technicians && i.technicians.length > 0 ? i.technicians.map(t => t.name).join(", ") : clean(i.technician);
const resolutionDays = (t: Ticket) => {
  const start = toDate(t.createdAt);
  const end = toDate(t.resolvedAt);
  if (!start || !end) return null;
  return Math.max(0, Math.round(((end.getTime() - start.getTime()) / 86400000) * 10) / 10);
};

// ---------- Mise en page commune ----------

// Bandeau titre en haut d'une feuille (lignes 1 et 2), retourne la ligne d'en-tête
function addSheetBanner(ws: Worksheet, title: string, subtitle: string, columnCount: number): number {
  ws.mergeCells(1, 1, 1, columnCount);
  const t = ws.getCell(1, 1);
  t.value = title;
  t.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FF" + COLORS.white } };
  t.fill = solid(COLORS.brand);
  t.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(1).height = 30;

  ws.mergeCells(2, 1, 2, columnCount);
  const s = ws.getCell(2, 1);
  s.value = subtitle;
  s.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF" + COLORS.muted } };
  s.fill = solid(COLORS.brandLight);
  s.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(2).height = 20;

  ws.getRow(3).height = 6;
  return 4;
}

interface ColumnDef {
  header: string;
  width: number;
  wrap?: boolean;
  align?: "left" | "center" | "right";
  numFmt?: string;
}

function addHeaderRow(ws: Worksheet, rowNumber: number, columns: ColumnDef[]) {
  const row = ws.getRow(rowNumber);
  columns.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width;
    const cell = row.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, size: 10, color: { argb: "FF" + COLORS.white } };
    cell.fill = solid(COLORS.brand);
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = thinBorder(COLORS.brand);
  });
  row.height = 32;
}

function styleBodyCell(cell: Cell, col: ColumnDef, fillColor: string | null) {
  cell.font = { size: 10, color: { argb: "FF" + COLORS.text } };
  cell.alignment = { vertical: "top", horizontal: col.align ?? "left", wrapText: !!col.wrap };
  cell.border = thinBorder();
  if (col.numFmt) cell.numFmt = col.numFmt;
  if (fillColor) cell.fill = solid(fillColor);
}

function paintBadge(cell: Cell, colors: { fill: string; font: string } | undefined) {
  if (!colors) return;
  cell.fill = solid(colors.fill);
  cell.font = { size: 10, bold: true, color: { argb: "FF" + colors.font } };
  cell.alignment = { vertical: "top", horizontal: "center" };
}

// Mise en page impression : paysage, ajusté à la largeur, en-têtes répétés
function setupPrint(ws: Worksheet, headerRow: number) {
  ws.pageSetup = {
    orientation: "landscape",
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    printTitlesRow: `${headerRow}:${headerRow}`,
  };
  ws.headerFooter = { oddFooter: "&L&8FOCUS Ticket&C&8Page &P / &N&R&8&D" };
}

// ---------- Feuille "Résumé" ----------
function buildSummarySheet(wb: Workbook, tickets: Ticket[], kind: TicketExportKind, filterLabels: string[], exportedAt: Date) {
  const ws = wb.addWorksheet("Résumé", { views: [{ showGridLines: false }], properties: { tabColor: { argb: "FF" + COLORS.brand } } });
  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 34;
  ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 3;
  ws.getColumn(6).width = 34;
  ws.getColumn(7).width = 16;

  ws.mergeCells("B2:G2");
  const title = ws.getCell("B2");
  title.value = "FOCUS Ticket : export des tickets";
  title.font = { size: 20, bold: true, color: { argb: "FF" + COLORS.brand } };
  ws.getRow(2).height = 34;

  ws.mergeCells("B3:G3");
  const sub = ws.getCell("B3");
  sub.value = kind === "detaille"
    ? "Version détaillée : tickets et historique complet des interventions"
    : "Version synthèse : une ligne par ticket";
  sub.font = { size: 11, italic: true, color: { argb: "FF" + COLORS.muted } };

  const info: [string, string][] = [
    ["Date de l'export", exportedAt.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })],
    ["Filtres appliqués", filterLabels.length ? filterLabels.join(" · ") : "Aucun (tous les tickets, archivés compris)"],
    ["Nombre de tickets", String(tickets.length)],
  ];
  let r = 5;
  info.forEach(([k, v]) => {
    ws.getCell(r, 2).value = k;
    ws.getCell(r, 2).font = { bold: true, size: 10, color: { argb: "FF" + COLORS.muted } };
    ws.mergeCells(r, 3, r, 7);
    ws.getCell(r, 3).value = v;
    ws.getCell(r, 3).font = { size: 10, color: { argb: "FF" + COLORS.text } };
    ws.getCell(r, 3).alignment = { wrapText: true, vertical: "top" };
    r++;
  });

  // Petit tableau d'indicateurs
  const table = (startRow: number, startCol: number, heading: string, rows: [string, number | string, string?][], colors?: Record<string, { fill: string; font: string }>) => {
    ws.mergeCells(startRow, startCol, startRow, startCol + 1);
    const h = ws.getCell(startRow, startCol);
    h.value = heading;
    h.font = { bold: true, size: 11, color: { argb: "FF" + COLORS.white } };
    h.fill = solid(COLORS.brand);
    h.alignment = { vertical: "middle", indent: 1 };
    ws.getRow(startRow).height = 22;
    rows.forEach(([label, value, key], i) => {
      const lc = ws.getCell(startRow + 1 + i, startCol);
      const vc = ws.getCell(startRow + 1 + i, startCol + 1);
      lc.value = label;
      vc.value = value;
      [lc, vc].forEach(c => {
        c.border = thinBorder();
        c.font = { size: 10 };
        c.fill = solid(i % 2 ? COLORS.zebra : COLORS.white);
      });
      lc.alignment = { indent: 1 };
      vc.alignment = { horizontal: "right" };
      vc.font = { size: 10, bold: true };
      if (key && colors?.[key]) paintBadge(lc, colors[key]), (lc.alignment = { indent: 1 });
    });
    return startRow + rows.length + 1;
  };

  const pct = (n: number) => (tickets.length ? `${Math.round((n / tickets.length) * 100)} %` : "0 %");
  const countBy = (fn: (t: Ticket) => string) =>
    tickets.reduce<Record<string, number>>((acc, t) => ((acc[fn(t)] = (acc[fn(t)] || 0) + 1), acc), {});

  const byStatus = countBy(t => normalizeTicketStatus(t.status));
  const statusRows: [string, string, string][] = ["open", "closed", "archived", "in-progress"]
    .filter(s => byStatus[s] || s !== "in-progress")
    .map(s => [statusLabel(s), `${byStatus[s] || 0}  (${pct(byStatus[s] || 0)})`, s]);

  const byPriority = countBy(t => String(t.priority || "medium").toLowerCase());
  const priorityRows: [string, string, string][] = ["critical", "high", "medium", "low"]
    .map(p => [priorityLabel(p), `${byPriority[p] || 0}  (${pct(byPriority[p] || 0)})`, p]);

  const resolved = tickets.map(resolutionDays).filter((d): d is number => d !== null);
  const avgDays = resolved.length ? Math.round((resolved.reduce((a, b) => a + b, 0) / resolved.length) * 10) / 10 : null;
  const interventionCount = tickets.reduce((s, t) => s + (t.interventions?.length ?? t.interventionsCount ?? 0), 0);
  const totalMinutes = tickets.reduce((s, t) => s + (t.interventions ?? []).reduce((m, i) => m + (i.durationMinutes || 0), 0), 0);

  const kpiRows: [string, string][] = [
    ["Tickets exportés", String(tickets.length)],
    ["Délai moyen de résolution", avgDays !== null ? `${avgDays} jour(s)` : "Non disponible"],
    ["Interventions enregistrées", String(interventionCount)],
  ];
  kpiRows.push(["Temps total d'intervention", formatMinutes(totalMinutes) || "Non renseigné"]);

  const start = r + 1;
  const afterStatus = table(start, 2, "Répartition par statut", statusRows, STATUS_COLORS);
  table(afterStatus + 1, 2, "Indicateurs clés", kpiRows);
  table(start, 6, "Répartition par priorité", priorityRows, PRIORITY_COLORS);

  // Top sites
  const bySite = countBy(t => clean(t.site) || "Non renseigné");
  const siteRows = Object.entries(bySite).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([s, n]) => [s, n] as [string, number]);
  table(start + priorityRows.length + 2, 6, "Tickets par site (top 8)", siteRows);

  ws.pageSetup = { orientation: "portrait", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 1 };
}

// ---------- Feuille "Tickets" ----------
const TICKET_COLUMNS: ColumnDef[] = [
  { header: "N° Ticket", width: 13, align: "center" },
  { header: "Titre", width: 32, wrap: true },
  { header: "Description", width: 48, wrap: true },
  { header: "Statut", width: 12, align: "center" },
  { header: "Priorité", width: 11, align: "center" },
  { header: "Catégorie", width: 13 },
  { header: "Site", width: 15 },
  { header: "Demandeur", width: 18 },
  { header: "Attribué à", width: 18 },
  { header: "Équipement", width: 22, wrap: true },
  { header: "N° de série", width: 16 },
  { header: "Date d'ouverture", width: 14, align: "center", numFmt: "dd/mm/yyyy" },
  { header: "Date de clôture", width: 14, align: "center", numFmt: "dd/mm/yyyy" },
  { header: "Délai de résolution (jours)", width: 13, align: "center", numFmt: "0.0" },
  { header: "Plan d'action initial", width: 40, wrap: true },
  { header: "Nombre d'interventions", width: 13, align: "center" },
  { header: "Temps total d'intervention", width: 13, align: "center" },
  { header: "Dernière intervention", width: 44, wrap: true },
  { header: "Actions menées (résumé)", width: 40, wrap: true },
  { header: "Commentaire", width: 32, wrap: true },
  { header: "Dernière mise à jour", width: 16, align: "center", numFmt: "dd/mm/yyyy hh:mm" },
];

function buildTicketsSheet(wb: Workbook, tickets: Ticket[], exportedAt: Date): Map<string, number> {
  const ws = wb.addWorksheet("Tickets", { properties: { tabColor: { argb: "FF0EA5E9" } } });
  const headerRow = addSheetBanner(
    ws,
    "Liste des tickets",
    `${tickets.length} ticket(s) · exporté le ${exportedAt.toLocaleDateString("fr-FR")} à ${exportedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
    TICKET_COLUMNS.length
  );
  addHeaderRow(ws, headerRow, TICKET_COLUMNS);

  const rowOfTicket = new Map<string, number>();
  tickets.forEach((t, index) => {
    const rowNumber = headerRow + 1 + index;
    rowOfTicket.set(t.id, rowNumber);
    const status = normalizeTicketStatus(t.status);
    const priority = String(t.priority || "medium").toLowerCase();
    const values = [
      clean(t.ticketNumber),
      clean(t.subject),
      clean(t.description),
      statusLabel(status),
      priorityLabel(priority),
      categoryLabel(t.category),
      clean(t.site),
      clean(t.createdBy),
      clean(t.assignedTo),
      clean(t.equipment),
      clean(t.serialNumber),
      toDate(t.createdAt),
      toDate(t.resolvedAt),
      resolutionDays(t),
      clean(t.actionPlan),
      t.interventions?.length ?? t.interventionsCount ?? 0,
      formatMinutes((t.interventions ?? []).reduce((m, i) => m + (i.durationMinutes || 0), 0)),
      lastInterventionText(t.interventions),
      clean(t.actions),
      clean(t.comment),
      toDate(t.updatedAt),
    ];
    const row = ws.getRow(rowNumber);
    const fill = index % 2 ? COLORS.zebra : null;
    values.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v as any;
      styleBodyCell(cell, TICKET_COLUMNS[i], fill);
    });
    row.getCell(1).font = { size: 10, bold: true, color: { argb: "FF" + COLORS.brand } };
    paintBadge(row.getCell(4), STATUS_COLORS[status]);
    paintBadge(row.getCell(5), PRIORITY_COLORS[priority]);
  });

  ws.views = [{ state: "frozen", xSplit: 2, ySplit: headerRow, showGridLines: false }];
  ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow + Math.max(tickets.length, 1), column: TICKET_COLUMNS.length } };
  setupPrint(ws, headerRow);
  return rowOfTicket;
}

// ---------- Feuille "Interventions" (version détaillée) ----------
const INTERVENTION_COLUMNS: ColumnDef[] = [
  { header: "N° Ticket", width: 13, align: "center" },
  { header: "Titre du ticket", width: 28, wrap: true },
  { header: "Statut actuel du ticket", width: 13, align: "center" },
  { header: "Étape", width: 8, align: "center" },
  { header: "Date", width: 12, align: "center", numFmt: "dd/mm/yyyy" },
  { header: "Heure", width: 8, align: "center", numFmt: "hh:mm" },
  { header: "Intervenant(s)", width: 24, wrap: true },
  { header: "Durée", width: 10, align: "center" },
  { header: "Actions réalisées", width: 50, wrap: true },
  { header: "Constat / résultat", width: 36, wrap: true },
  { header: "Prochaines étapes", width: 32, wrap: true },
  { header: "Statut après l'intervention", width: 14, align: "center" },
];

function buildInterventionsSheet(wb: Workbook, tickets: Ticket[], rowOfTicket: Map<string, number>) {
  const ws = wb.addWorksheet("Interventions", { properties: { tabColor: { argb: "FF10B981" } } });
  const total = tickets.reduce((s, t) => s + (t.interventions?.length || 0), 0);
  const headerRow = addSheetBanner(
    ws,
    "Historique des interventions par ticket",
    `${total} intervention(s) sur ${tickets.length} ticket(s) · l'étape 0 rappelle le plan d'action initial de chaque ticket`,
    INTERVENTION_COLUMNS.length
  );
  addHeaderRow(ws, headerRow, INTERVENTION_COLUMNS);

  let r = headerRow + 1;
  tickets.forEach((t, ticketIndex) => {
    const status = normalizeTicketStatus(t.status);
    const band = ticketIndex % 2 ? COLORS.zebra : COLORS.white;
    const interventions: Intervention[] = t.interventions ?? [];
    const firstRow = r;

    const writeRow = (values: any[], opts: { plan?: boolean } = {}) => {
      const row = ws.getRow(r);
      values.forEach((v, i) => {
        const cell = row.getCell(i + 1);
        cell.value = v;
        styleBodyCell(cell, INTERVENTION_COLUMNS[i], opts.plan ? COLORS.planFill : band);
        if (opts.plan && i >= 3) cell.font = { size: 10, italic: true, color: { argb: "FF" + COLORS.planText } };
      });
      r++;
      return row;
    };

    // Étape 0 : plan d'action initial
    const planRow = writeRow(
      // L'étape 0 n'est pas une intervention : la colonne "Intervenant" reste vide (le demandeur n'est pas un intervenant)
      [clean(t.ticketNumber), clean(t.subject), statusLabel(status), 0, toDate(t.createdAt), null, "", "",
        t.actionPlan ? `Plan d'action initial :\n${t.actionPlan}` : "Plan d'action initial : non défini", "", "", ""],
      { plan: true }
    );
    planRow.getCell(5).numFmt = "dd/mm/yyyy";

    interventions.forEach(i => {
      const when = toDate(i.performedAt);
      const after = i.statusAfter ? normalizeTicketStatus(i.statusAfter) : null;
      const row = writeRow([
        clean(t.ticketNumber),
        clean(t.subject),
        statusLabel(status),
        i.stepNumber,
        when,
        when,
        technicianNames(i),
        formatMinutes(i.durationMinutes || 0),
        clean(i.actions),
        clean(i.result),
        clean(i.nextSteps),
        after ? statusLabel(after) : "Inchangé",
      ]);
      if (after) paintBadge(row.getCell(12), STATUS_COLORS[after]);
      row.getCell(4).font = { size: 10, bold: true, color: { argb: "FF059669" } };
    });

    if (interventions.length === 0) {
      writeRow([clean(t.ticketNumber), clean(t.subject), statusLabel(status), "", null, null, "", "", "Aucune intervention enregistrée", "", "", ""]);
      ws.getRow(r - 1).getCell(9).font = { size: 10, italic: true, color: { argb: "FF" + COLORS.muted } };
    }

    // Ticket : numéro en lien vers sa ligne dans la feuille "Tickets", statut coloré, séparation épaisse
    const lastRow = r - 1;
    for (let row = firstRow; row <= lastRow; row++) {
      const numberCell = ws.getCell(row, 1);
      const target = rowOfTicket.get(t.id);
      // Lien interne via la formule LIEN_HYPERTEXTE (les liens internes natifs d'ExcelJS rendent le fichier invalide pour Excel)
      if (target) {
        const label = clean(t.ticketNumber).replace(/"/g, '""');
        numberCell.value = { formula: `HYPERLINK("#'Tickets'!A${target}","${label}")`, result: clean(t.ticketNumber) } as any;
      }
      numberCell.font = { size: 10, bold: true, underline: true, color: { argb: "FF" + COLORS.brand } };
      paintBadge(ws.getCell(row, 3), STATUS_COLORS[status]);
    }
    for (let c = 1; c <= INTERVENTION_COLUMNS.length; c++) {
      const cell = ws.getCell(firstRow, c);
      cell.border = { ...cell.border, top: { style: "medium", color: { argb: "FF" + COLORS.brand } } };
    }
    // Les lignes d'un même ticket peuvent être repliées dans Excel
    for (let row = firstRow + 1; row <= lastRow; row++) ws.getRow(row).outlineLevel = 1;
  });

  ws.views = [{ state: "frozen", xSplit: 2, ySplit: headerRow, showGridLines: false }];
  ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: Math.max(r - 1, headerRow + 1), column: INTERVENTION_COLUMNS.length } };
  setupPrint(ws, headerRow);
}

// ---------- Point d'entrée ----------
export async function exportTicketsToExcel(tickets: Ticket[], kind: TicketExportKind, filterLabels: string[] = []) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const exportedAt = new Date();
  wb.creator = "FOCUS Ticket";
  wb.created = exportedAt;
  wb.title = kind === "detaille" ? "Export détaillé des tickets" : "Export synthèse des tickets";

  buildSummarySheet(wb, tickets, kind, filterLabels, exportedAt);
  const rowOfTicket = buildTicketsSheet(wb, tickets, exportedAt);
  if (kind === "detaille") buildInterventionsSheet(wb, tickets, rowOfTicket);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const stamp = exportedAt.toISOString().slice(0, 10);
  const fileName = kind === "detaille" ? `tickets_detaille_interventions_${stamp}.xlsx` : `tickets_synthese_${stamp}.xlsx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
}
