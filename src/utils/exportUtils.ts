import { Ticket } from "@/types/ticket";
import { User } from "@/types/user";
import { Asset } from "@/types/asset";
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Professional PDF Generator for a Single Ticket
export const generateTicketPDF = (ticket: Ticket): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header - Title & Logo Style
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Add Logo if available
  try {
    doc.addImage('/logo.png', 'PNG', 15, 8, 24, 24);
  } catch (e) {
    // If logo fails, fallback to text logo
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("FOCUS TICKET", 15, 25);
  }
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`RAPPORT DE TICKET : ${ticket.ticketNumber || ticket.id}`, 45, 22);
  doc.text(`Généré par Focus Ticket System`, 45, 28);
  
  doc.setFontSize(8);
  doc.text(`Date: ${new Date().toLocaleString('fr-FR')}`, pageWidth - 15, 25, { align: 'right' });
  
  // Ticket Main Info Table 
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setTextColor(30, 41, 59);
  
  const statusLabel = ticket.status === 'closed' ? 'CLÔTURÉ' : (ticket.status === 'in-progress' ? 'EN COURS' : 'OUVERT');
  
  autoTable(doc, {
    startY: 50,
    head: [['Information', 'Détails']],
    body: [
      ['N° Ticket', String(ticket.ticketNumber || ticket.id)],
      ['Sujet', String(ticket.subject || '')],
      ['Statut', String(statusLabel)],
      ['Priorité', String(ticket.priority || '').toUpperCase()],
      ['Demandeur', String(ticket.createdBy || 'Inconnu')],
      ['Attribué à', String(ticket.assignedTo || 'Non attribué')],
      ['Site', ticket.site || 'N/A'],
    ],
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 15, right: 15 }
  });
  
  let finalY = (doc as any).lastAutoTable.finalY + 15;
  
  // Equipment Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("ÉQUIPEMENT & MATÉRIEL", 15, finalY);
  doc.setLineWidth(0.5);
  doc.line(15, finalY + 2, pageWidth - 15, finalY + 2);
  
  finalY += 10;
  autoTable(doc, {
    startY: finalY,
    body: [
      ['Équipement', ticket.equipment || 'N/A'],
      ['Numéro de série', ticket.serialNumber || 'N/A']
    ],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
    margin: { left: 15 }
  });
  
  finalY = (doc as any).lastAutoTable.finalY + 15;
  
  // Description section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("DESCRIPTION DU PROBLÈME", 15, finalY);
  doc.setLineWidth(0.5);
  doc.line(15, finalY + 2, pageWidth - 15, finalY + 2);
  
  finalY += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const splitDesc = doc.splitTextToSize(ticket.description || "Aucune description fournie.", pageWidth - 30);
  doc.text(splitDesc, 15, finalY);
  
  finalY += (splitDesc.length * 5) + 15;
  
  // Log / Intervention section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("LOG D'INTERVENTION & ACTIONS", 15, finalY);
  doc.setLineWidth(0.5);
  doc.line(15, finalY + 2, pageWidth - 15, finalY + 2);
  
  finalY += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  const actionsText = ticket.actions || "Aucune action enregistrée pour le moment.";
  const splitActions = doc.splitTextToSize(actionsText, pageWidth - 30);
  
  doc.setFillColor(241, 245, 249);
  doc.rect(15, finalY - 5, pageWidth - 30, (splitActions.length * 5) + 10, 'F');
  doc.text(splitActions, 20, finalY + 2);
  
  finalY += (splitActions.length * 5) + 20;

  // COMMENTS SECTION (NEW)
  if (ticket.comments && ticket.comments.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("DISCUSSION / HISTORIQUE", 15, finalY);
    doc.setLineWidth(0.5);
    doc.line(15, finalY + 2, pageWidth - 15, finalY + 2);
    
    finalY += 10;
    const commentRows = ticket.comments.map(c => [
      `${c.user?.name || "User"}\n${new Date(c.createdAt).toLocaleDateString('fr-FR')}`,
      c.content
    ]);
    
    autoTable(doc, {
      startY: finalY,
      body: commentRows,
      theme: 'grid',
      styles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold' } },
      margin: { left: 15, right: 15 }
    });
    
    finalY = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Timeline dates
  autoTable(doc, {
    startY: finalY,
    head: [['Événement', 'Date']],
    body: [
      ['Création du ticket', new Date(ticket.createdAt).toLocaleDateString('fr-FR')],
      ['Clôture du ticket', ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleDateString('fr-FR') : 'En cours']
    ],
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [100, 116, 139] },
    margin: { left: 15, right: 15 }
  });
  
  // Footer
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} sur ${totalPages} - Document généré par Focus Ticket System`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  // Save the PDF
  doc.save(`Ticket_${ticket.ticketNumber || ticket.id}_Export.pdf`);
};
  
// Convert tickets data to CSV format
export const ticketsToCSV = (tickets: Ticket[]): string => {
  if (tickets.length === 0) return '';
  
  const headers = [
    'ticketNumber', 
    'title', 
    'status', 
    'createdAt', 
    'priority',
    'creatorId',
    'assigneeId',
    'equipment',
    'site',
    'actions',
    'resolvedAt',
    'comment',
    'serialNumber'
  ].join(',');
  
  const rows = tickets.map(ticket => {
    return [
      ticket.ticketNumber || ticket.id,
      `"${(ticket.subject || '').replace(/"/g, '""')}"`,
      ticket.status,
      ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('fr-FR') : '',
      ticket.priority,
      ticket.createdBy || ticket.creatorId || 'Inconnu',
      ticket.assignedTo || ticket.assigneeId || 'Non attribué',
      `"${(ticket.equipment || '').replace(/"/g, '""')}"`,
      ticket.site || '',
      `"${(ticket.actions || '').replace(/"/g, '""')}"`,
      ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleDateString('fr-FR') : '',
      `"${(ticket.comment || '').replace(/"/g, '""')}"`,
      ticket.serialNumber || ''
    ].join(',');
  });
  
  return [headers, ...rows].join('\n');
};

// Convert assets data to CSV format
export const assetsToCSV = (assets: Asset[]): string => {
  if (assets.length === 0) return '';
  const headers = ['ID', 'Nom/Produit', 'Numéro de série', 'Type', 'Projet', 'Fabricant', 'Modèle', 'Site', 'Statut'].join(',');
  const rows = assets.map(asset => {
    return [
      asset.id,
      `"${asset.name.replace(/"/g, '""')}"`,
      `"${(asset.serialNumber || '').replace(/"/g, '""')}"`,
      asset.type,
      `"${(asset.projet || '').replace(/"/g, '""')}"`,
      `"${(asset.fabricant || '').replace(/"/g, '""')}"`,
      `"${(asset.modele || '').replace(/"/g, '""')}"`,
      asset.site,
      asset.status
    ].join(',');
  });
  return [headers, ...rows].join('\n');
};

// Convert users data to CSV format
export const usersToCSV = (users: User[]): string => {
  if (users.length === 0) return '';
  const headers = ['ID', 'Name', 'Email', 'Role', 'Department', 'Status', 'Last Active', 'Tickets Assigned', 'Tickets Resolved'].join(',');
  const rows = users.map(user => {
    return [
      user.id,
      `"${user.name.replace(/"/g, '""')}"`,
      user.email,
      user.role,
      user.department || 'N/A',
      user.status,
      user.lastActive ? new Date(user.lastActive).toLocaleString() : 'N/A',
      user.ticketsAssigned || 0,
      user.ticketsResolved || 0
    ].join(',');
  });
  return [headers, ...rows].join('\n');
};

export const downloadCSV = (data: string, filename: string): void => {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + data], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const parseFrenchDate = (val: any): string | null => {
  if (!val || val === '?' || val === '-' || val === 'null' || val === 'N/A') return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val.toISOString();

  const str = String(val).trim().replace(/\n/g, ' ');
  if (!str) return null;

  const numVal = Number(str);
  if (!isNaN(numVal) && numVal > 10000 && numVal < 100000) {
    const date = new Date((numVal - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) return date.toISOString();
  }
  
  const dateRegex = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/;
  const match = str.match(dateRegex);
  if (match) {
    let day = parseInt(match[1], 10);
    let month = parseInt(match[2], 10);
    let year = parseInt(match[3], 10);
    if (year >= 0 && year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month - 1, day, 12, 0, 0);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString();
  return null;
};

export const processImportedTickets = async (file: File): Promise<Ticket[]> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return resolve([]);
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, blankrows: false });
        
        let headerRowIndex = -1;
        let columnMap: Record<string, number> = {};
        
        for (let i = 0; i < Math.min(json.length, 10); i++) {
          const row = json[i];
          if (!row || !Array.isArray(row)) continue;
          const rowStr = row.join(' ').toLowerCase();
          if ((rowStr.includes('ticket') || rowStr.includes('nº') || rowStr.includes('id')) && (rowStr.includes('titre') || rowStr.includes('title') || rowStr.includes('sujet') || rowStr.includes('subject'))) {
            headerRowIndex = i;
            row.forEach((col: any, idx: number) => {
              if (col) {
                const key = String(col).toLowerCase().trim();
                if (key.includes('ticketnumber') || key === 'id' || key === 'ticket' || key.includes('nº')) columnMap['id'] = idx;
                else if (key === 'title' || key.includes('titre') || key.includes('sujet')) columnMap['subject'] = idx;
                else if (key === 'status' || key.includes('statut')) columnMap['status'] = idx;
                else if (key === 'createdat' || key.includes('ouverture') || key.includes('créé')) columnMap['createdAt'] = idx;
                else if (key === 'priority' || key.startsWith('priorit')) columnMap['priority'] = idx;
                else if (key === 'creatorid' || key.includes('demandeur') || key.includes('créateur')) columnMap['createdBy'] = idx;
                else if (key === 'assigneeid' || key.includes('attribu') || key.includes('agent')) columnMap['assignedTo'] = idx;
                else if (key === 'equipment' || key.includes('équipement')) columnMap['equipment'] = idx;
                else if (key === 'serialnumber' || key === 'serialnum' || key.includes('série') || key.includes('serial') || key === 's/n') columnMap['serialNumber'] = idx;
                else if (key === 'site' || key.includes('lieu')) columnMap['site'] = idx;
                else if (key === 'actions' || key.includes('action')) columnMap['actions'] = idx;
                else if (key === 'resolvedat' || key.includes('résolu') || key.includes('clôture')) columnMap['resolvedAt'] = idx;
                else if (key === 'comment' || key.includes('comment')) columnMap['comment'] = idx;
                else if (key.includes('desc')) columnMap['description'] = idx;
              }
            });
            break;
          }
        }
        
        if (headerRowIndex === -1) return resolve([]);
        const rawRows = json.slice(headerRowIndex + 1);
        const tickets: Ticket[] = [];
        for (const row of rawRows) {
          if (!row || !Array.isArray(row) || row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) continue;
          
          const getVal = (key: string) => columnMap[key] !== undefined ? String(row[columnMap[key]] || '').trim() : '';
          const id = getVal('id');
          const subject = getVal('subject');
          if (!id && !subject) continue;
          const rawStatus = getVal('status').toLowerCase();
          const mappedStatus = (rawStatus.includes('résolu') || rawStatus.includes('clos') || rawStatus.includes('clot') || rawStatus.includes('clôt') || rawStatus.includes('fin')) ? 'closed' 
                             : (rawStatus.includes('en cours') || rawStatus.includes('progress')) ? 'in-progress' : 'open';
          const rawPriority = getVal('priority').toLowerCase();
          const mappedPriority = (rawPriority.includes('haut') || rawPriority.includes('high')) ? 'high'
                               : (rawPriority.includes('critique') || rawPriority.includes('urgent')) ? 'critical'
                               : (rawPriority.includes('bas') || rawPriority.includes('low')) ? 'low' : 'medium';

          const ticketId = id ? `${id}_${Math.random().toString(36).substr(2, 4)}` : `IMPORT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

          tickets.push({
            id: ticketId,
            ticketNumber: id || 'R-IMPORT',
            subject: subject || 'Sans titre',
            description: getVal('description') || subject || 'Importé depuis Excel',
            status: mappedStatus as any,
            createdAt: getVal('createdAt') ? (parseFrenchDate(getVal('createdAt')) || new Date().toISOString()) : new Date().toISOString(),
            priority: mappedPriority as any,
            createdBy: getVal('createdBy') || 'Importé',
            assignedTo: getVal('assignedTo') || null,
            equipment: getVal('equipment') || 'N/A',
            serialNumber: getVal('serialNumber') || 'N/A',
            site: getVal('site') || 'N/A',
            actions: getVal('actions') || '',
            resolvedAt: parseFrenchDate(getVal('resolvedAt')),
            comment: getVal('comment') || '',
            category: 'other',
            creatorId: '',
            assigneeId: null,
            assetId: null,
            updatedAt: new Date().toISOString()
          });
        }
        resolve(tickets);
      } catch (err) {
        console.error("Error parsing file", err);
        resolve([]);
      }
    };
    reader.readAsBinaryString(file);
  });
};

export const processImportedAssets = async (file: File): Promise<any[]> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return resolve([]);
        const workbook = XLSX.read(data, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, blankrows: false });
        let headerRowIndex = -1;
        let columnMap: Record<string, number> = {};
        for (let i = 0; i < json.length; i++) {
          const row = json[i];
          if (!row || !Array.isArray(row)) continue;
          const rowStr = row.join(' ').toLowerCase();
          if (rowStr.includes('série') || rowStr.includes('serial') || rowStr.includes('produit')) {
            headerRowIndex = i;
            row.forEach((col: any, idx: number) => {
              if (typeof col === 'string') {
                const key = col.toLowerCase().trim();
                if (key.includes('série') || key.includes('serial')) columnMap['serialNumber'] = idx;
                else if (key.includes('projet')) columnMap['project'] = idx;
                else if (key.includes('fabricant')) columnMap['manufacturer'] = idx;
                else if (key.includes('produit')) columnMap['name'] = idx;
                else if (key.includes('type')) columnMap['type'] = idx;
                else if (key.includes('site')) columnMap['location'] = idx;
                else if (key.includes('status')) columnMap['status'] = idx;
              }
            });
            break;
          }
        }
        if (headerRowIndex === -1) return resolve([]);
        const assets: any[] = [];
        for (let i = headerRowIndex + 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0) continue;
          const getVal = (key: string) => columnMap[key] !== undefined ? String(row[columnMap[key]] || '').trim() : '';
          const serial = getVal('serialNumber');
          if (serial === '' && columnMap['serialNumber'] !== undefined) continue;
          assets.push({
            id: `AST-${Math.floor(Math.random() * 100000)}`,
            serialNumber: serial,
            name: getVal('name') || 'Actif Inconnu',
            projet: getVal('project') || '',
            fabricant: getVal('manufacturer') || 'Inconnu',
            type: getVal('type') || 'peripheral',
            site: getVal('location') || 'Non spécifié',
            status: getVal('status') || 'available'
          });
        }
        resolve(assets);
      } catch (err) {
        console.error("Error parsing asset file", err);
        resolve([]);
      }
    };
    reader.readAsBinaryString(file);
  });
};
