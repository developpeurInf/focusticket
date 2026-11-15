
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  TicketCheck, 
  UserRound, 
  Settings, 
  BarChart3, 
  PlusCircle,
  Users,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Clock,
  Shield,
  Laptop,
  BookOpen,
  Archive,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { TOGGLE_MOBILE_SIDEBAR_EVENT } from "@/lib/sidebarEvents";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import CreateTicketForm from "@/components/CreateTicketForm";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { mockTickets } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  userRole: "admin" | "agent" | "customer";
}

export default function Sidebar({ userRole }: SidebarProps) {
  // L'état replié/déplié est mémorisé pour ne pas se réinitialiser à chaque changement de page
  const [desktopExpanded, setDesktopExpandedState] = useState<boolean>(() => {
    try { return localStorage.getItem("sidebar-expanded") !== "false"; } catch { return true; }
  });
  const setDesktopExpanded = (value: boolean) => {
    setDesktopExpandedState(value);
    try { localStorage.setItem("sidebar-expanded", String(value)); } catch { /* stockage indisponible */ }
  };
  const [mobileOpen, setMobileOpen] = useState(false);
  // Sur mobile, le menu s'ouvre en tiroir et affiche toujours les libellés
  const expanded = mobileOpen || desktopExpanded;
  const [ticketsExpanded, setTicketsExpanded] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const navigateToTickets = (filter: string) => {
    // Use React Router's navigate to go to the tickets tab with the filter
    navigate('/?tab=tickets&filter=' + filter);
  };

  const [open, setOpen] = useState(false);

  // Ouverture du tiroir depuis le bouton menu de l'en-tête (mobile)
  useEffect(() => {
    const toggle = () => setMobileOpen(o => !o);
    window.addEventListener(TOGGLE_MOBILE_SIDEBAR_EVENT, toggle);
    return () => window.removeEventListener(TOGGLE_MOBILE_SIDEBAR_EVENT, toggle);
  }, []);

  // Fermer le tiroir à chaque changement de page
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  // Fermer le tiroir avec la touche Échap
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const openCount = mockTickets.filter(t => t.status === 'open').length;
  const resolvedCount = mockTickets.filter(t => (t.status === 'resolved' || t.status === 'closed')).length;

  return (
    <>
    {/* Voile sombre derrière le tiroir (mobile) */}
    <div
      className={cn(
        "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden",
        mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
      )}
      onClick={() => setMobileOpen(false)}
      aria-hidden="true"
    />
    <aside
      className={cn(
        "flex h-[100dvh] shrink-0 flex-col border-r bg-background transition-all duration-300",
        // Mobile : tiroir fixe qui glisse depuis la gauche
        "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-xl",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        // Bureau : colonne fixe, repliable
        "md:relative md:z-auto md:max-w-none md:translate-x-0 md:shadow-none",
        desktopExpanded ? "md:w-64" : "md:w-16"
      )}
    >
      <div className={cn("flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 md:h-20", !expanded && "px-2")}>
        {expanded && (
          <img src="/logo.png" alt="FOCUS NEXT COMPUTING" className="h-10 w-auto min-w-0 rounded object-contain dark:bg-white dark:px-1.5 dark:py-0.5 md:h-12" />
        )}
        {/* Replier / déplier (bureau) */}
        <Button
          variant="ghost"
          size="icon"
          className={cn("hidden h-8 w-8 shrink-0 text-muted-foreground md:inline-flex", !expanded && "mx-auto")}
          onClick={() => setDesktopExpanded(!desktopExpanded)}
          title={desktopExpanded ? "Réduire le menu" : "Agrandir le menu"}
          aria-label={desktopExpanded ? "Réduire le menu" : "Agrandir le menu"}
        >
          {desktopExpanded ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </Button>
        {/* Fermer (mobile) */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Fermer le menu"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1 py-4">
        <nav className="space-y-6 px-2">
          {/* Section Tableau de bord */}
          <div>
            {expanded && <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Général</div>}
            <SidebarItem 
              icon={<LayoutDashboard />} 
              label="Tableau de bord" 
              expanded={expanded}
              onClick={() => navigate('/?tab=overview')}
              active={location.pathname === '/' && (!location.search || location.search.includes('tab=overview'))}
            />
          </div>

          {/* Section Parc */}
          <div>
            {expanded && <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parc (Inventaire)</div>}
            <SidebarItem 
              icon={<Laptop />} 
              label="Tous les Actifs" 
              expanded={expanded}
              onClick={() => navigate('/assets')}
              active={location.pathname === '/assets'}
            />
          </div>

          {/* Section Assistance */}
          <div>
            {expanded && <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assistance</div>}
            <Collapsible 
              open={expanded && ticketsExpanded} 
              onOpenChange={expanded ? setTicketsExpanded : undefined}
              disabled={!expanded}
            >
              <div className="flex items-center gap-1">
                <SidebarItem 
                  icon={<TicketCheck />} 
                  label="Tickets" 
                  expanded={expanded} 
                  active={location.search.includes('tab=tickets')}
                  onClick={() => navigateToTickets('all')}
                />
                {expanded && (
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground"
                      aria-label={ticketsExpanded ? "Masquer les filtres de tickets" : "Afficher les filtres de tickets"}
                    >
                      <ChevronDown className={cn("h-4 w-4 transition-transform", !ticketsExpanded && "-rotate-90")} />
                    </Button>
                  </CollapsibleTrigger>
                )}
              </div>
              
              <CollapsibleContent className="ml-9 mt-1 space-y-1">
                <SidebarSubItem 
                  icon={<AlertCircle className="text-red-500" />} 
                  label="Ouverts" 
                  badge={openCount > 0 ? openCount.toString() : ""} 
                  onClick={() => navigateToTickets('open')}
                  active={location.search.includes('filter=open')}
                />
                <SidebarSubItem 
                  icon={<CheckCircle2 className="text-green-500" />} 
                  label="Clôturés" 
                  badge={resolvedCount > 0 ? resolvedCount.toString() : ""} 
                  onClick={() => navigateToTickets('closed')}
                  active={location.search.includes('filter=closed')}
                />
                <SidebarSubItem
                  icon={<Archive className="text-slate-500" />}
                  label="Archivés"
                  badge=""
                  onClick={() => navigateToTickets('archived')}
                  active={location.search.includes('filter=archived')}
                />
              </CollapsibleContent>
            </Collapsible>
            
            <SidebarItem 
              icon={<BookOpen />} 
              label="Base de connaissances" 
              expanded={expanded}
              onClick={() => navigate('/knowledge-base')}
              active={location.pathname === '/knowledge-base'}
            />
          </div>
          
          {/* Section Administration */}
          <div>
            {expanded && <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Administration</div>}
            {userRole === "admin" && (
              <>
                <SidebarItem 
                  icon={<Users />} 
                  label="Utilisateurs" 
                  expanded={expanded}
                  onClick={() => navigate('/?tab=users')}
                  active={location.search.includes('tab=users')}
                />
                <SidebarItem 
                  icon={<BarChart3 />} 
                  label="Rapports & Stats" 
                  expanded={expanded}
                  onClick={() => navigate('/reports')}
                  active={location.pathname === '/reports'}
                />
              </>
            )}
            
            <SidebarItem 
              icon={<Settings />} 
              label="Paramètres" 
              expanded={expanded}
              onClick={() => navigate('/settings')}
              active={location.pathname === '/settings'}
            />
          </div>
        </nav>
      </ScrollArea>

      <div className={cn("shrink-0 border-t p-4", !expanded && "px-2")}>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className={cn("w-full justify-start gap-2 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-gray-200", !expanded && "justify-center")}>
              <PlusCircle className="h-5 w-5 shrink-0" />
              {expanded && "Créer un ticket"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un nouveau ticket</DialogTitle>
              <DialogDescription>
                Veuillez remplir les informations pour ouvrir un dossier d'assistance.
              </DialogDescription>
            </DialogHeader>
            <CreateTicketForm onSuccess={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
        
        <Button 
          variant="ghost" 
          onClick={logout}
          className={cn(
            "w-full justify-start gap-2 text-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 mt-2",
            !expanded && "justify-center"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {expanded && "Déconnexion"}
        </Button>
      </div>
    </aside>
    </>
  );
}

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  expanded: boolean;
  active?: boolean;
  onClick?: () => void;
}

function SidebarItem({ icon, label, expanded, active, onClick }: SidebarItemProps) {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      className={cn(
        "w-full min-w-0 flex-1 justify-start",
        !expanded && "justify-center px-0",
        active && "bg-primary/10 text-primary hover:bg-primary/15"
      )}
      onClick={onClick}
      title={!expanded ? label : undefined}
      aria-label={!expanded ? label : undefined}
    >
      {icon}
      {expanded && <span className="ml-2 truncate">{label}</span>}
    </Button>
  );
}

interface SidebarSubItemProps {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  active?: boolean;
  onClick?: () => void;
}

function SidebarSubItem({ icon, label, badge, active, onClick }: SidebarSubItemProps) {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="sm"
      className={cn(
        "w-full justify-start h-8 px-2 text-sm font-normal",
        active && "bg-primary/10 text-primary hover:bg-primary/15"
      )}
      onClick={onClick}
    >
      {icon}
      <span className="ml-2 truncate">{label}</span>
      {badge && (
        <span className="ml-auto bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
          {badge}
        </span>
      )}
    </Button>
  );
}
