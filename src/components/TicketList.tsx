import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  SearchIcon, 
  Upload,
  PlusCircle,
  Activity,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Download,
  SortDesc,
  SortAsc,
  Filter,
  Archive,
  ChevronDown,
  FileSpreadsheet,
  ListTree
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TicketDetails from "@/components/TicketDetails";
import CreateTicketForm from "./CreateTicketForm";
import { Ticket } from "@/types/ticket";
import { useToast } from "@/components/ui/use-toast";
import { processImportedTickets } from "@/utils/exportUtils";
import { getTickets, deleteTicket, createTicket, exportTickets, updateTicket, getTicketFilterOptions, TicketFilterOptions } from "@/data/ticketService";
import TicketFilters, { ActiveFilterChips, EMPTY_TICKET_FILTERS, TicketFilterState, countActiveFilters, describeFilters, filtersToParams } from "@/components/tickets/TicketFilters";
import { getTicketStatusConfig, normalizeTicketStatus } from "@/lib/ticketStatus";
import { addNotification } from "@/utils/notificationUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface TicketListProps {
  userRole: 'admin' | 'agent' | 'customer';
  initialStatusFilter?: string;
}

export default function TicketList({ userRole, initialStatusFilter = "" }: TicketListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [allTickets, setAllTickets] = useState<Ticket[]>([]); // This will now hold just the current page's tickets
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [readMoreContent, setReadMoreContent] = useState<{title: string, text: string} | null>(null);
  
  // Pagination & Filtering (Server-side)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(13); // Demandé: 13
  const [totalTickets, setTotalTickets] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filters, setFilters] = useState<TicketFilterState>(EMPTY_TICKET_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState<TicketFilterOptions | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const activeFilterCount = countActiveFilters(filters);

  // Toute modification d'un filtre ramène à la première page
  const updateFilters = (next: TicketFilterState) => {
    setFilters(next);
    setCurrentPage(1);
  };

  const currentFilters = {
    search: searchQuery || undefined,
    ...filtersToParams(filters)
  };

  const [isExporting, setIsExporting] = useState(false);
  const handleExport = async (kind: 'synthese' | 'detaille') => {
    setIsExporting(true);
    try {
      const fileName = await exportTickets(kind, currentFilters, describeFilters(filters, filterOptions, searchQuery));
      toast({ title: "Export Excel prêt", description: `Le fichier ${fileName} a été téléchargé.` });
    } catch (error) {
      console.error("Export Excel failed", error);
      toast({ title: "Échec de l'export Excel", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const statusMap: Record<string, string> = {
    'ouvert': 'open',
    'open': 'open',
    'Ouvert': 'open',
    'cloturé': 'closed',
    'clôturé': 'closed',
    'closed': 'closed',
    'Clôturé': 'closed',
    'Résolu': 'closed',
    'resolved': 'closed',
    'archived': 'archived',
    'archivé': 'archived',
    'Archivé': 'archived'
  };

  useEffect(() => {
    if (initialStatusFilter === "all" || initialStatusFilter === "" || initialStatusFilter === "assigned") {
      setFilters(f => ({ ...f, status: [] }));
      setCurrentPage(1);
    } else if (initialStatusFilter) {
      const normalized = statusMap[initialStatusFilter] || initialStatusFilter;
      setFilters(f => ({ ...f, status: [normalized] }));
      setCurrentPage(1);
    }
  }, [initialStatusFilter]);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      // On prépare les statuts. On utilise statusFilter s'il n'est pas vide.
      // Sinon on se base sur initialStatusFilter pour une synchronisation immédiate.
      const getEffectiveStatus = () => {
        // Le filtre venant du menu latéral est recopié dans filters.status (voir l'effet ci-dessus)
        if (filters.status.length > 0) return filters.status;
        return undefined;
      };

      const finalStatus = getEffectiveStatus();

      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
        ...currentFilters,
        status: finalStatus && finalStatus.length > 0 ? finalStatus.join(",") : undefined,
        sortBy,
        sortOrder
      };

      // Si c'est un agent et filtre "assigned"
      if (userRole === 'agent' && initialStatusFilter === 'assigned') {
        params.assigneeId = 'current-user';
      }

      const result = await getTickets(params);
      setAllTickets(result.tickets);
      setTotalTickets(result.pagination.total);
      setTotalPages(result.pagination.pages);
      setSelectedIds([]); 
    } catch (error) {
      console.error("Fetch tickets error:", error);
      setAllTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [currentPage, itemsPerPage, searchQuery, filters, userRole, sortBy, sortOrder, reloadKey]);

  // Valeurs proposées dans les filtres (sites, intervenants, demandeurs...)
  useEffect(() => {
    getTicketFilterOptions()
      .then(setFilterOptions)
      .catch(err => console.error("Filter options error:", err));
  }, [reloadKey]);

  useEffect(() => {
    const reload = () => setReloadKey(k => k + 1);
    window.addEventListener('tickets-updated', reload);
    return () => window.removeEventListener('tickets-updated', reload);
  }, []);

  // On garde filteredTickets pointant sur allTickets pour la compatibilité avec le reste du code
  const filteredTickets = allTickets;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTickets = allTickets; // Deja paginé par le serveur

  const getPriorityLabel = (priority: string) => {
    if (!priority) return 'Moyenne';
    switch (String(priority).toLowerCase()) {
      case 'low': case 'bas': case 'basse': return 'Basse';
      case 'medium': case 'moyenne': return 'Moyenne';
      case 'high': case 'haut': case 'haute': return 'Haute';
      case 'critical': case 'critique': return 'Critique';
      default: return priority;
    }
  };


  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket) return;
    try {
      await updateTicket(selectedTicket.id, { status: newStatus });
      setSelectedTicket({ ...selectedTicket, status: normalizeTicketStatus(newStatus) });
      toast({
        title: "Statut mis à jour",
        description: `Le ticket ${selectedTicket.ticketNumber || selectedTicket.id} est maintenant « ${getTicketStatusConfig(newStatus).label} ».`,
      });
      setReloadKey(k => k + 1);
    } catch (error) {
      console.error("Status update error:", error);
      toast({ title: "Échec de la mise à jour du statut", variant: "destructive" });
    }
  };

  const handleAssign = () => {
    if (selectedTicket) {
      toast({
        title: "Ticket assigné",
        description: `Le ticket ${selectedTicket.id} a été assigné à l'intervenant`,
      });
    }
  };



  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedTickets = await processImportedTickets(file);
      
      if (parsedTickets.length > 0) {
        toast({
          title: "Importation en cours...",
          description: `Enregistrement de ${parsedTickets.length} tickets dans PostgreSQL. Veuillez patienter...`
        });
        
        let successCount = 0;
        let failCount = 0;
        
        for (const t of parsedTickets) {
          try {
            const statusMap: Record<string, string> = { 
              'Ouvert': 'open', 'ouvert': 'open',
              'En cours': 'open', 'en cours': 'open',
              'Résolu': 'closed', 'résolu': 'closed',
              'Clos': 'closed', 'clos': 'closed',
              'Clôturé': 'closed', 'clôturé': 'closed',
              'Cloturé': 'closed', 'cloturé': 'closed',
              'closed': 'closed', 'open': 'open'
            };
            const priorityMap: Record<string, string> = { 'Basse': 'low', 'Moyenne': 'medium', 'Haute': 'high', 'Critique': 'critical', 'Urgent': 'critical' };
  
            await createTicket({
              title: t.subject || (t as any).title || 'Ticket Sans Titre',
              subject: t.subject || (t as any).title || 'Ticket Sans Titre',
              description: t.description || 'Importé depuis Excel',
              status: statusMap[t.status] || t.status || 'open',
              priority: priorityMap[t.priority] || t.priority || 'medium',
              category: t.category || 'other',
              createdBy: t.createdBy || 'Importé',
              assignedTo: t.assignedTo,
              equipment: t.equipment,
              serialNumber: t.serialNumber,
              ticketNumber: t.ticketNumber || t.id.split('_')[0],
              site: t.site,
              comment: t.comment,
              actions: t.actions,
              resolvedAt: t.resolvedAt,
              createdAt: t.createdAt
            } as any);
            successCount++;
          } catch (error) {
            console.error(`Erreur import ticket ${t.id}:`, error);
            failCount++;
          }
        }
        
        loadTickets();
        
        if (failCount === 0) {
          toast({
            title: "Import réussi",
            description: `${successCount} tickets importés et sauvegardés avec succès.`,
          });
        } else {
          toast({
            title: "Import terminé avec erreurs",
            description: `${successCount} importés, ${failCount} échecs.`,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Échec de l'import",
          description: "Aucun ticket valide trouvé.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Import error", error);
      toast({
        title: "Erreur persistante",
        description: "Un problème est survenu lors de l'enregistrement PostgreSQL.",
        variant: "destructive",
      });
    }
    e.target.value = '';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle>Tickets</CardTitle>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0 md:w-64">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Chercher des tickets..."
                className="pl-8"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>


            <Button
              variant={showFilters || activeFilterCount > 0 ? "default" : "outline"}
              className="gap-2"
              onClick={() => setShowFilters(v => !v)}
              aria-expanded={showFilters}
            >
              <Filter className="h-4 w-4" />
              Filtres
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-background/90 px-1.5 text-[11px] font-bold text-primary">{activeFilterCount}</span>
              )}
            </Button>

            <div className="relative">
              <input
                type="file"
                accept=".csv, .xlsx, .xls" 
                onChange={handleImport} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                title="Importer des tickets (Excel/CSV)"
              />
              <Button variant="outline" size="icon">
                <Upload className="h-4 w-4" />
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isExporting}
                  className="flex items-center gap-2 h-10 border-blue-200 text-blue-700 font-bold bg-blue-50/50 hover:bg-blue-100 transition-all rounded-xl"
                >
                  {isExporting ? <Activity className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Exporter Excel
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {activeFilterCount > 0 || searchQuery ? "Export des tickets filtrés" : "Export de tous les tickets (archivés compris)"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex-col items-start gap-0.5 py-2" onClick={() => handleExport('synthese')}>
                  <span className="flex items-center gap-2 font-semibold"><FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Version synthèse</span>
                  <span className="pl-6 text-xs text-muted-foreground">Une ligne par ticket, toutes les informations</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex-col items-start gap-0.5 py-2" onClick={() => handleExport('detaille')}>
                  <span className="flex items-center gap-2 font-semibold"><ListTree className="h-4 w-4 text-blue-600" /> Version détaillée</span>
                  <span className="pl-6 text-xs text-muted-foreground">Synthèse + historique de chaque intervention, étape par étape</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {selectedIds.length > 0 && (
              <Button 
                variant="destructive" 
                className="gap-2"
                onClick={async () => {
                  if (confirm(`Voulez-vous supprimer les ${selectedIds.length} tickets sélectionnés ?`)) {
                    for (const id of selectedIds) {
                      await deleteTicket(id);
                    }
                    toast({ title: "Suppression réussie", description: `${selectedIds.length} tickets ont été supprimés.` });
                    loadTickets();
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                Supprimer ({selectedIds.length})
              </Button>
            )}

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Ajouter un ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Ajouter un nouveau ticket</DialogTitle>
                  <DialogDescription>
                    Veuillez remplir les informations pour ouvrir un dossier d'assistance.
                  </DialogDescription>
                </DialogHeader>
                <CreateTicketForm onSuccess={() => setIsCreateDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {showFilters && (
          <div className="pt-4">
            <TicketFilters value={filters} onChange={updateFilters} options={filterOptions} />
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
          <ActiveFilterChips value={filters} onChange={updateFilters} options={filterOptions} />
          {activeFilterCount > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              <span className="font-bold text-foreground">{totalTickets}</span> ticket(s) correspondant(s)
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border shadow-sm overflow-x-auto border-t-4 border-t-primary bg-card">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30">
                <TableHead className="w-[40px] px-4">
                  <Checkbox 
                    checked={filteredTickets.length > 0 && selectedIds.length === filteredTickets.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedIds(filteredTickets.map(t => t.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead 
                  className="whitespace-nowrap px-2 cursor-pointer hover:text-primary transition-colors select-none"
                  onClick={() => handleSort('ticketNumber')}
                >
                  <div className="flex items-center gap-1 group">
                    N° Ticket
                    {sortBy === 'ticketNumber' ? (sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100" />}
                  </div>
                </TableHead>
                <TableHead className="whitespace-nowrap px-2 min-w-[150px]">Titre</TableHead>
                <TableHead 
                  className="whitespace-nowrap px-2 cursor-pointer hover:text-primary transition-colors select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1 group">
                    Statut
                    {sortBy === 'status' ? (sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100" />}
                  </div>
                </TableHead>
                <TableHead 
                  className="whitespace-nowrap px-2 cursor-pointer hover:text-primary transition-colors select-none"
                  onClick={() => handleSort('priority')}
                >
                  <div className="flex items-center gap-1 group">
                    Priorité
                    {sortBy === 'priority' ? (sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100" />}
                  </div>
                </TableHead>
                <TableHead className="whitespace-nowrap px-2">Demandeur</TableHead>
                <TableHead className="whitespace-nowrap px-2">Attribué à</TableHead>
                <TableHead className="whitespace-nowrap px-2">Équipement</TableHead>
                <TableHead className="whitespace-nowrap px-2">N° Série</TableHead>
                <TableHead className="whitespace-nowrap px-2">Site</TableHead>
                <TableHead 
                  className="whitespace-nowrap px-2 cursor-pointer hover:text-primary transition-colors select-none"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-1 group">
                    Ouverture
                    {sortBy === 'createdAt' ? (sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100" />}
                  </div>
                </TableHead>
                <TableHead 
                  className="whitespace-nowrap px-2 cursor-pointer hover:text-primary transition-colors select-none"
                  onClick={() => handleSort('resolvedAt')}
                >
                  <div className="flex items-center gap-1 group">
                    Clôture
                    {sortBy === 'resolvedAt' ? (sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100" />}
                  </div>
                </TableHead>
                <TableHead className="whitespace-nowrap px-2">Intervention</TableHead>
                <TableHead className="whitespace-nowrap px-2">Commentaire</TableHead>
                <TableHead className="text-right sticky right-0 px-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTickets.length > 0 ? (
                paginatedTickets.map((ticket) => {
                  if (!ticket) return null;
                  const normalizedStatus = normalizeTicketStatus(ticket.status);
                  const statusConfig = getTicketStatusConfig(normalizedStatus);
                  const statusInfo = {
                    label: statusConfig.label.toUpperCase(),
                    color: statusConfig.badgeClass,
                    icon: normalizedStatus === 'closed' ? <CheckCircle2 className="h-3 w-3" />
                      : normalizedStatus === 'archived' ? <Archive className="h-3 w-3" />
                      : <XCircle className="h-3 w-3" />
                  };

                  return (
                  <TableRow 
                    key={ticket.id} 
                    className={cn(
                      "group cursor-pointer hover:bg-primary/5 transition-all duration-200 border-b border-border/50 hover:shadow-sm",
                      selectedIds.includes(ticket.id) && "bg-primary/5",
                      normalizedStatus === 'archived' && "opacity-70"
                    )}
                    onClick={() => {
                      setSelectedTicket(ticket);
                    }}
                  >
                    <TableCell className="w-[40px] px-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={selectedIds.includes(ticket.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedIds(prev => [...prev, ticket.id]);
                          } else {
                            setSelectedIds(prev => prev.filter(id => id !== ticket.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-[11px] whitespace-nowrap px-2 font-bold text-muted-foreground">{ticket.ticketNumber || "N/A"}</TableCell>
                    <TableCell className="min-w-[150px] font-semibold text-sm px-2">
                      {ticket.subject || "Sans titre"}
                    </TableCell>
                    <TableCell className="px-2">
                       <Badge variant="outline" className={cn("font-bold px-2 py-0.5 uppercase text-[9px] tracking-tighter whitespace-nowrap", statusInfo.color)}>
                        <span className="flex items-center gap-1">{statusInfo.icon} {statusInfo.label}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2">
                       <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase", 
                         (ticket.priority || '').toLowerCase() === 'critical' || (ticket.priority || '').toLowerCase() === 'high' ? "bg-red-50 text-red-700" : 
                         (ticket.priority || '').toLowerCase() === 'low' ? "bg-slate-50 text-slate-600" : "bg-blue-50 text-blue-700"
                       )}>
                         {getPriorityLabel(ticket.priority)}
                       </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs px-2">{ticket.createdBy || "Inconnu"}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs px-2 font-medium">{ticket.assignedTo || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs px-2 font-medium">{ticket.equipment || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap text-[11px] px-2 font-mono">{ticket.serialNumber || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs px-2">{ticket.site || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap text-[11px] px-2">
                       {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('fr-FR') : "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[11px] px-2 font-bold text-emerald-600">
                      {ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleDateString('fr-FR') : "-"}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-[11px] px-2 italic font-medium">{ticket.actions || "-"}</TableCell>
                    <TableCell className="max-w-[150px] truncate text-[11px] px-2 italic text-muted-foreground">{ticket.comment || "-"}</TableCell>
                    <TableCell className="text-right px-4 sticky right-0 bg-background/95 group-hover:bg-primary/5 transition-colors">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTicket(ticket);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-7 w-7 text-red-600 hover:bg-red-50"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm("Voulez-vous vraiment supprimer ce ticket ?")) {
                              await deleteTicket(ticket.id);
                              addNotification("Ticket Supprimé", `Le ticket ${ticket.ticketNumber || ticket.id} a été supprimé definitivement.`, userRole);
                              window.dispatchEvent(new CustomEvent('tickets-updated'));
                              toast({ title: "Ticket supprimé" });
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={15} className="text-center py-12 text-muted-foreground italic">
                    Aucun ticket trouvé avec les filtres actuels
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {isLoading && (
          <div className="flex items-center justify-center py-20 bg-background/50 absolute inset-0 z-50">
            <div className="flex flex-col items-center gap-2">
              <Activity className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm font-bold text-muted-foreground">Chargement des données...</p>
            </div>
          </div>
        )}
      </CardContent>

      {/* Pagination Controls */}
      {totalTickets > 0 && (
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground font-medium">
            Affichage de <span className="font-bold text-foreground">{Math.min(totalTickets, startIndex + 1)}-{Math.min(totalTickets, startIndex + paginatedTickets.length)}</span> sur <span className="font-bold text-foreground">{totalTickets}</span> tickets
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground mr-2">Par page :</span>
            <select 
              className="bg-background border border-border rounded text-xs p-1 focus:ring-1 focus:ring-primary outline-none cursor-pointer"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[13, 25, 50, 100].map(val => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1 || isLoading}
            >
              <span className="sr-only">Première page</span>
              <ChevronLeft className="h-4 w-4" />
              <ChevronLeft className="h-4 w-4 -ml-2" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 px-2 flex gap-1 items-center"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" /> Précédent
            </Button>
            
            <div className="flex items-center px-4 h-8 bg-background border border-border rounded text-xs font-black shadow-sm">
              Page {currentPage} / {totalPages || 1}
            </div>

            <Button 
              variant="outline" 
              size="sm"
              className="h-8 px-2 flex gap-1 items-center"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages || isLoading}
            >
              Suivant <ChevronRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages || isLoading}
            >
              <span className="sr-only">Dernière page</span>
              <ChevronRight className="h-4 w-4" />
              <ChevronRight className="h-4 w-4 -ml-2" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Modifier le Ticket {editingTicket?.ticketNumber}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {editingTicket && (
              <CreateTicketForm 
                ticket={editingTicket} 
                onSuccess={() => {
                  setIsEditDialogOpen(false);
                  loadTickets();
                }} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-4xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Détails du Ticket {selectedTicket?.ticketNumber}</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <TicketDetails 
              ticket={selectedTicket} 
              onStatusChange={handleStatusChange}
              onAssign={handleAssign}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!readMoreContent} onOpenChange={(open) => !open && setReadMoreContent(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              {readMoreContent?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="bg-muted/30 p-6 rounded-lg border border-border mt-2">
             <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
               {readMoreContent?.text}
             </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setReadMoreContent(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
