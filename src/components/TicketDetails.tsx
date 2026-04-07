import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Ticket } from "@/types/ticket";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { mockUsers } from "@/data/mockUsers";
import { generateTicketPDF } from "@/utils/exportUtils";
import { FileText } from "lucide-react";

interface TicketDetailsProps {
  ticket: Ticket;
  onStatusChange: (newStatus: string) => void;
  onAssign: (agentId: string) => void;
  userRole?: 'admin' | 'agent' | 'customer';
}

export default function TicketDetails({ 
  ticket, 
  onStatusChange, 
  onAssign,
  userRole = 'agent'
}: TicketDetailsProps) {
  const [status, setStatus] = useState<'open' | 'in-progress' | 'resolved' | 'closed'>(ticket.status as any);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500';
      case 'in-progress':
        return 'bg-yellow-500';
      case 'resolved':
      case 'closed':
        return 'bg-green-500';
      default:
        return 'bg-blue-500';
    }
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Date inconnue";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Date invalide";
      return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      }).format(date);
    } catch (e) {
      return "Date invalide";
    }
  };

  const handleStatusChange = (newStatus: string) => {
    const typedStatus = newStatus as 'open' | 'in-progress' | 'resolved' | 'closed';
    setStatus(typedStatus);
    onStatusChange(newStatus);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold font-mono text-muted-foreground uppercase tracking-wider">
              {ticket.ticketNumber || ticket.id}
            </h3>
            <Badge className={getStatusColor(status || 'open')}>
              {String(status || 'OUVERT').replace('-', ' ').toUpperCase()}
            </Badge>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{ticket.subject}</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Ouvert le : {formatDate(ticket.createdAt)}</span>
            <span>•</span>
            <span className="font-semibold uppercase text-[11px] bg-slate-100 px-2 py-0.5 rounded">
              Priorité : {ticket.priority}
            </span>
            <span>•</span>
            <span>Site : {ticket.site}</span>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
          <div>
            <h4 className="font-bold text-slate-500 mb-1 uppercase text-[10px]">Équipement / Module</h4>
            <p className="font-medium">{ticket.equipment || "N/A"}</p>
          </div>
          <div>
            <h4 className="font-bold text-slate-500 mb-1 uppercase text-[10px]">Numéro de série</h4>
            <p className="font-mono font-bold bg-white px-2 py-0.5 rounded border">{ticket.serialNumber || "N/A"}</p>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
            <span className="h-4 w-1 bg-primary rounded-full"></span>
            Description du problème
          </h3>
          <div className="text-sm bg-white border rounded-md p-4 shadow-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {ticket.description}
          </div>
        </div>

        {ticket.actions && (
          <>
            <Separator />
            <div>
              <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2 text-emerald-700">
                <span className="h-4 w-1 bg-emerald-500 rounded-full"></span>
                Log d'Intervention / Action(s) menée(s)
              </h3>
              <div className="text-sm border border-emerald-100 rounded-md p-4 bg-emerald-50/30 text-emerald-900 leading-relaxed whitespace-pre-wrap italic">
                {ticket.actions}
              </div>
            </div>
          </>
        )}

        {ticket.comment && (
          <>
            <Separator />
            <div>
              <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <span className="h-4 w-1 bg-slate-400 rounded-full"></span>
                Commentaires / Notes supplémentaires
              </h3>
              <p className="text-sm italic text-slate-600 bg-slate-50 p-3 rounded border border-dashed">
                {ticket.comment}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="space-y-6">
        {(userRole === 'admin' || userRole === 'agent') && (
          <>
            <div className="space-y-3 rounded-xl border-2 border-slate-100 p-5 bg-white shadow-sm">
              <h3 className="font-bold text-sm text-slate-900">Gestion du statut</h3>
              <Select defaultValue={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choisir un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Statut</SelectLabel>
                    <SelectItem value="open">Ouvert</SelectItem>
                    <SelectItem value="closed">Clôturé</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 rounded-xl border-2 border-slate-100 p-5 bg-white shadow-sm">
              <h3 className="font-bold text-sm text-slate-900">Affectation</h3>
              <Select onValueChange={onAssign}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={ticket.assignedTo || "Choisir un agent"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Intervenants disponibles</SelectLabel>
                    <SelectItem value="none">Aucun</SelectItem>
                    {mockUsers.filter(u => u.role === 'intervenant' || u.role === 'admin').map(user => (
                      <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <div className="space-y-4 rounded-xl border-2 border-slate-100 p-5 bg-slate-50/50">
          <h3 className="font-bold text-sm text-slate-900 border-b pb-2">Résumé Temporal</h3>
          <dl className="space-y-4 text-xs">
            <div className="flex flex-col">
              <dt className="text-slate-500 font-bold mb-1 uppercase tracking-tighter">Demandeur :</dt>
              <dd className="font-bold text-slate-900 bg-white border px-2 py-1.5 rounded shadow-sm">{ticket.createdBy}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-slate-500 font-bold mb-1 uppercase tracking-tighter">Attribué à :</dt>
              <dd className="font-medium text-slate-700">{ticket.assignedTo || "En attente d'affectation"}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-slate-500 font-bold mb-1 uppercase tracking-tighter">Date d'ouverture :</dt>
              <dd className="text-slate-700">{formatDate(ticket.createdAt)}</dd>
            </div>
            {ticket.dueDate && (
              <div className="flex flex-col">
                <dt className="text-slate-500 font-bold mb-1 uppercase tracking-tighter">Objectif SLA :</dt>
                <dd className={
                  (() => {
                    if (ticket.status === 'closed') return "text-green-600 font-bold";
                    if (!ticket.dueDate) return "text-slate-500";
                    const diff = new Date(ticket.dueDate).getTime() - new Date().getTime();
                    if (diff < 0) return "text-red-600 font-black";
                    return "text-blue-600 font-bold";
                  })()
                }>
                  {formatDate(ticket.dueDate)}
                </dd>
              </div>
            )}
            {ticket.resolvedAt && (
              <div className="flex flex-col mt-2 pt-2 border-t">
                <dt className="text-emerald-700 font-bold mb-1 uppercase tracking-tighter">Clôturé le :</dt>
                <dd className="text-emerald-700 font-black text-sm">{formatDate(ticket.resolvedAt)}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="space-y-3 p-2">
          <Button 
            variant="default" 
            className="w-full py-6 text-md font-bold gap-3 shadow-lg bg-slate-900 hover:bg-slate-800 transition-all border-b-4 border-slate-700" 
            onClick={() => generateTicketPDF(ticket)}
          >
            <FileText className="h-5 w-5" />
            EXPORTER EN PDF
          </Button>
          <p className="text-[10px] text-center text-muted-foreground uppercase font-bold tracking-widest">
            Document Professionnel focus ticket
          </p>
        </div>
      </div>
    </div>
  );
}
