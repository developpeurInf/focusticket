import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ClipboardList, Pencil, Plus, Trash2, Clock, User as UserIcon, Wrench, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Intervention, Ticket } from "@/types/ticket";
import {
  getInterventions,
  addIntervention,
  updateIntervention,
  deleteIntervention,
  updateTicket,
  getTechnicians,
  InterventionInput,
  Technician,
} from "@/data/ticketService";
import MultiSelectFilter from "./MultiSelectFilter";
import { TICKET_STATUSES, TICKET_STATUS_CONFIG, getTicketStatusConfig } from "@/lib/ticketStatus";

interface TicketInterventionsProps {
  ticket: Ticket;
  canEdit?: boolean;
  // Appelé quand une intervention change le statut du ticket
  onStatusChanged?: (status: string) => void;
}

// Valeur pour <input type="datetime-local"> à partir d'une date
const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export const formatDuration = (minutes: number | null | undefined) => {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${m > 0 ? String(m).padStart(2, "0") : ""}`.trim() : `${m} min`;
};

interface FormState {
  performedAt: string;
  technicianIds: string[];
  durationMinutes: string;
  actions: string;
  result: string;
  nextSteps: string;
  statusAfter: string;
}

const emptyForm = (technicianIds: string[]): FormState => ({
  performedAt: toLocalInput(new Date()),
  technicianIds,
  durationMinutes: "",
  actions: "",
  result: "",
  nextSteps: "",
  statusAfter: "",
});

// Noms des intervenants d'une étape (liste liée, sinon ancien champ texte)
export const interventionTechnicianNames = (i: Intervention) =>
  i.technicians && i.technicians.length > 0 ? i.technicians.map(t => t.name).join(", ") : i.technician || "";

// Identifiants des intervenants d'une étape ; pour les anciennes étapes, retrouvés à partir des noms
const technicianIdsOf = (i: Intervention, technicians: Technician[]) => {
  if (i.technicians && i.technicians.length > 0) return i.technicians.map(t => t.id);
  const names = String(i.technician || "").split(",").map(n => n.trim().toLowerCase()).filter(Boolean);
  return technicians.filter(t => names.includes(t.name.toLowerCase())).map(t => t.id);
};

function InterventionForm({
  initial,
  technicians,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: FormState;
  technicians: Technician[];
  submitLabel: string;
  onSubmit: (data: InterventionInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof FormState, value: string) => setForm(f => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.actions.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        performedAt: new Date(form.performedAt).toISOString(),
        technicianIds: form.technicianIds,
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
        actions: form.actions,
        result: form.result,
        nextSteps: form.nextSteps,
        statusAfter: (form.statusAfter || null) as any,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">Date et heure</Label>
          <Input type="datetime-local" required value={form.performedAt} onChange={e => set("performedAt", e.target.value)} />
        </div>
        <MultiSelectFilter
          label="Intervenant(s)"
          options={technicians.map(t => ({ value: t.id, label: t.name }))}
          selected={form.technicianIds}
          onChange={ids => setForm(f => ({ ...f, technicianIds: ids }))}
          placeholder="Choisir les intervenants"
        />
        <div className="space-y-1">
          <Label className="text-xs">Durée (minutes)</Label>
          <Input type="number" min={0} step={5} value={form.durationMinutes} placeholder="ex. 45" onChange={e => set("durationMinutes", e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Actions réalisées *</Label>
        <Textarea required className="min-h-[80px]" value={form.actions} placeholder="Ce qui a été fait pendant cette intervention" onChange={e => set("actions", e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Constat / résultat</Label>
          <Textarea className="min-h-[60px]" value={form.result} placeholder="Résultat obtenu, observations" onChange={e => set("result", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Prochaines étapes</Label>
          <Textarea className="min-h-[60px]" value={form.nextSteps} placeholder="Ce qui reste à faire" onChange={e => set("nextSteps", e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Statut du ticket après l'intervention</Label>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={form.statusAfter}
            onChange={e => set("statusAfter", e.target.value)}
          >
            <option value="">Inchangé</option>
            {TICKET_STATUSES.map(s => (
              <option key={s} value={s}>{TICKET_STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>Annuler</Button>
          <Button type="submit" disabled={saving || !form.actions.trim()} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default function TicketInterventions({ ticket, canEdit = true, onStatusChanged }: TicketInterventionsProps) {
  const { toast } = useToast();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [plan, setPlan] = useState(ticket.actionPlan || "");
  const [editingPlan, setEditingPlan] = useState(false);
  const [planDraft, setPlanDraft] = useState(plan);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  useEffect(() => {
    getTechnicians().then(setTechnicians).catch(err => console.error("Technicians load error:", err));
  }, []);

  // Par défaut, la personne à qui le ticket est attribué est proposée comme intervenant
  const defaultTechnicianIds = technicians
    .filter(t => t.id === ticket.assigneeId || (!!ticket.assignedTo && t.name === ticket.assignedTo))
    .map(t => t.id);

  const load = async () => {
    try {
      setInterventions(await getInterventions(ticket.id));
    } catch (err) {
      console.error("Interventions load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setPlan(ticket.actionPlan || "");
    load();
  }, [ticket.id]);

  const afterChange = (statusAfter?: string | null) => {
    if (statusAfter) onStatusChanged?.(statusAfter);
    window.dispatchEvent(new CustomEvent("tickets-updated"));
  };

  const handleAdd = async (data: InterventionInput) => {
    try {
      await addIntervention(ticket.id, data);
      toast({ title: "Intervention ajoutée", description: "L'étape a été enregistrée dans l'historique du ticket." });
      setAdding(false);
      await load();
      afterChange(data.statusAfter);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur", description: err?.response?.data?.error || "Impossible d'ajouter l'intervention." });
    }
  };

  const handleUpdate = async (id: string, data: InterventionInput) => {
    try {
      await updateIntervention(ticket.id, id, data);
      toast({ title: "Intervention modifiée" });
      setEditingId(null);
      await load();
      afterChange(data.statusAfter);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur", description: err?.response?.data?.error || "Impossible de modifier l'intervention." });
    }
  };

  const handleDelete = async (i: Intervention) => {
    if (!confirm(`Supprimer l'étape ${i.stepNumber} ? Les étapes suivantes seront renumérotées.`)) return;
    try {
      await deleteIntervention(ticket.id, i.id);
      toast({ title: "Intervention supprimée" });
      await load();
      afterChange();
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer l'intervention." });
    }
  };

  const savePlan = async () => {
    try {
      await updateTicket(ticket.id, { actionPlan: planDraft });
      setPlan(planDraft);
      setEditingPlan(false);
      toast({ title: "Plan d'action enregistré" });
      afterChange();
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer le plan d'action." });
    }
  };

  const totalMinutes = interventions.reduce((sum, i) => sum + (i.durationMinutes || 0), 0);

  return (
    <div className="space-y-5">
      {/* Plan d'action initial */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold text-foreground">
            <span className="h-4 w-1 rounded-full bg-indigo-500" />
            <ClipboardList className="h-4 w-4 text-indigo-500" />
            Plan d'action initial
          </h3>
          {canEdit && !editingPlan && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => { setPlanDraft(plan); setEditingPlan(true); }}>
              <Pencil className="h-3 w-3" /> {plan ? "Modifier" : "Définir"}
            </Button>
          )}
        </div>
        {editingPlan ? (
          <div className="space-y-2">
            <Textarea className="min-h-[90px]" value={planDraft} onChange={e => setPlanDraft(e.target.value)} placeholder="Étapes prévues pour traiter le ticket" />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingPlan(false)}>Annuler</Button>
              <Button size="sm" onClick={savePlan}>Enregistrer</Button>
            </div>
          </div>
        ) : plan ? (
          <div className="whitespace-pre-wrap rounded-md border border-indigo-100 bg-indigo-50/40 p-4 text-sm leading-relaxed dark:border-indigo-900 dark:bg-indigo-950/20">
            {plan}
          </div>
        ) : (
          <p className="rounded-md border border-dashed p-3 text-sm italic text-muted-foreground">Aucun plan d'action défini.</p>
        )}
      </div>

      {/* Historique des interventions */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-bold text-foreground">
            <span className="h-4 w-1 rounded-full bg-emerald-500" />
            <Wrench className="h-4 w-4 text-emerald-600" />
            Historique des interventions
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {interventions.length} étape{interventions.length > 1 ? "s" : ""}
              {totalMinutes > 0 && ` · ${formatDuration(totalMinutes)} au total`}
            </span>
          </h3>
          {canEdit && !adding && (
            <Button size="sm" className="h-8 gap-1" onClick={() => { setAdding(true); setEditingId(null); }}>
              <Plus className="h-4 w-4" /> Ajouter une intervention
            </Button>
          )}
        </div>

        {adding && (
          <div className="mb-4">
            <InterventionForm
              initial={emptyForm(defaultTechnicianIds)}
              technicians={technicians}
              submitLabel={`Enregistrer l'étape ${interventions.length + 1}`}
              onSubmit={handleAdd}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement des interventions...
          </div>
        ) : interventions.length === 0 ? (
          !adding && (
            <p className="rounded-md border border-dashed p-3 text-sm italic text-muted-foreground">
              Aucune intervention enregistrée pour le moment.
            </p>
          )
        ) : (
          <ol className="relative ml-3 space-y-4 border-l-2 border-emerald-200 dark:border-emerald-900">
            {interventions.map(i => {
              const status = i.statusAfter ? getTicketStatusConfig(i.statusAfter) : null;
              return (
                <li key={i.id} className="relative pl-6">
                  <span className="absolute -left-[13px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white ring-4 ring-background">
                    {i.stepNumber}
                  </span>
                  {editingId === i.id ? (
                    <InterventionForm
                      initial={{
                        performedAt: toLocalInput(new Date(i.performedAt)),
                        technicianIds: technicianIdsOf(i, technicians),
                        durationMinutes: i.durationMinutes ? String(i.durationMinutes) : "",
                        actions: i.actions,
                        result: i.result || "",
                        nextSteps: i.nextSteps || "",
                        statusAfter: i.statusAfter || "",
                      }}
                      technicians={technicians}
                      submitLabel="Enregistrer"
                      onSubmit={data => handleUpdate(i.id, data)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="group rounded-lg border bg-card p-4 shadow-sm">
                      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-bold text-foreground">Étape {i.stepNumber}</span>
                        <span>{formatDateTime(i.performedAt)}</span>
                        {interventionTechnicianNames(i) && (
                          <span className="flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            {interventionTechnicianNames(i)}
                          </span>
                        )}
                        {i.durationMinutes ? <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(i.durationMinutes)}</span> : null}
                        {status && (
                          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", status.badgeClass)}>
                            → {status.label}
                          </span>
                        )}
                        {canEdit && (
                          <span className="ml-auto flex gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingId(i.id); setAdding(false); }} aria-label={`Modifier l'étape ${i.stepNumber}`}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600" onClick={() => handleDelete(i)} aria-label={`Supprimer l'étape ${i.stepNumber}`}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{i.actions}</p>
                      {(i.result || i.nextSteps) && (
                        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                          {i.result && (
                            <div className="rounded border-l-2 border-sky-400 bg-sky-50/60 p-2 dark:bg-sky-950/20">
                              <span className="font-bold text-sky-700 dark:text-sky-300">Constat : </span>
                              <span className="whitespace-pre-wrap">{i.result}</span>
                            </div>
                          )}
                          {i.nextSteps && (
                            <div className="rounded border-l-2 border-amber-400 bg-amber-50/60 p-2 dark:bg-amber-950/20">
                              <span className="font-bold text-amber-700 dark:text-amber-300">Prochaines étapes : </span>
                              <span className="whitespace-pre-wrap">{i.nextSteps}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
