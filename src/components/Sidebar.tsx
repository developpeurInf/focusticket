
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
  BookOpen
} from "lucide-react";
import { useState } from "react";
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
  const [expanded, setExpanded] = useState(true);
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

  const openCount = mockTickets.filter(t => t.status === 'open').length;
  const resolvedCount = mockTickets.filter(t => (t.status === 'resolved' || t.status === 'closed')).length;

  return (
    <div 
      className={cn(
        "h-screen border-r flex flex-col bg-background transition-all duration-300",
        expanded ? "w-64" : "w-16"
      )}
    >
      <div className="p-4 flex justify-between items-center h-20">
        {expanded && (
          <img src="/logo.png" alt="FNC Logo" className="h-12 w-auto rounded object-contain" />
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(!expanded && "mx-auto")}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "←" : "→"}
        </Button>
      </div>

      <ScrollArea className="flex-1 py-4">
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
              <div className="flex items-center">
                <SidebarItem 
                  icon={<TicketCheck />} 
                  label="Tickets" 
                  expanded={expanded} 
                  active={location.search.includes('tab=tickets')}
                  onClick={() => navigateToTickets('all')}
                />
                {expanded && (
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0 h-auto w-7">
                      {ticketsExpanded ? "−" : "+"}
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

      <div className="p-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className={cn("w-full justify-start gap-2 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-gray-200", !expanded && "justify-center")}>
              <PlusCircle className="h-5 w-5" />
              {expanded && "Créer un ticket"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
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
          <LogOut className="h-5 w-5" />
          {expanded && "Déconnexion"}
        </Button>
      </div>
    </div>
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
        "w-full justify-start",
        !expanded && "justify-center px-0",
        active && "bg-primary/10 hover:bg-primary/20"
      )}
      onClick={onClick}
    >
      {icon}
      {expanded && <span className="ml-2">{label}</span>}
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
        active && "bg-primary/10 hover:bg-primary/20"
      )}
      onClick={onClick}
    >
      {icon}
      <span className="ml-2">{label}</span>
      {badge && (
        <span className="ml-auto bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
          {badge}
        </span>
      )}
    </Button>
  );
}
