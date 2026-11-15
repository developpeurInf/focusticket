import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import MultiSelectFilter, { FilterOption } from "./MultiSelectFilter";
import {
  TICKET_STATUSES,
  TICKET_STATUS_CONFIG,
  TICKET_PRIORITY_LABELS,
  TICKET_CATEGORY_LABELS,
} from "@/lib/ticketStatus";
import { TicketFilterOptions } from "@/data/ticketService";

export interface TicketFilterState {
  status: string[];
  priority: string[];
  category: string[];
  site: string[];
  assigneeId: string[];
  creatorId: string[];
  equipment: string;
  serialNumber: string;
  createdFrom: string;
  createdTo: string;
  resolvedFrom: string;
  resolvedTo: string;
}

export const EMPTY_TICKET_FILTERS: TicketFilterState = {
  status: [],
  priority: [],
  category: [],
  site: [],
  assigneeId: [],
  creatorId: [],
  equipment: "",
  serialNumber: "",
  createdFrom: "",
  createdTo: "",
  resolvedFrom: "",
  resolvedTo: "",
};

const PRIORITY_ORDER = ["low", "medium", "high", "critical"];

// Nombre d'attributs sur lesquels un filtre est actif
export function countActiveFilters(f: TicketFilterState): number {
  return [
    f.status.length > 0,
    f.priority.length > 0,
    f.category.length > 0,
    f.site.length > 0,
    f.assigneeId.length > 0,
    f.creatorId.length > 0,
    !!f.equipment.trim(),
    !!f.serialNumber.trim(),
    !!(f.createdFrom || f.createdTo),
    !!(f.resolvedFrom || f.resolvedTo),
  ].filter(Boolean).length;
}

// Transforme l'état des filtres en paramètres de requête pour l'API
export function filtersToParams(f: TicketFilterState): Record<string, any> {
  const params: Record<string, any> = {};
  (["status", "priority", "category", "site", "assigneeId", "creatorId"] as const).forEach(key => {
    if (f[key].length > 0) params[key] = f[key].join(",");
  });
  (["equipment", "serialNumber", "createdFrom", "createdTo", "resolvedFrom", "resolvedTo"] as const).forEach(key => {
    const v = f[key].trim();
    if (v) params[key] = v;
  });
  return params;
}

const formatDay = (d: string) => (d ? new Date(d).toLocaleDateString("fr-FR") : "");
const rangeLabel = (from: string, to: string) =>
  from && to ? `du ${formatDay(from)} au ${formatDay(to)}` : from ? `depuis le ${formatDay(from)}` : `jusqu'au ${formatDay(to)}`;

interface TicketFiltersProps {
  value: TicketFilterState;
  onChange: (value: TicketFilterState) => void;
  options: TicketFilterOptions | null;
}

// Champ texte qui ne déclenche la recherche qu'après une courte pause de frappe
function DebouncedInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => onChange(local), 400);
    return () => clearTimeout(t);
  }, [local]);
  return <Input className="h-9" placeholder={placeholder} value={local} onChange={e => setLocal(e.target.value)} />;
}

function DateRange({ label, from, to, onChange }: { label: string; from: string; to: string; onChange: (from: string, to: string) => void }) {
  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <Input type="date" className="h-9 text-xs" value={from} max={to || undefined} onChange={e => onChange(e.target.value, to)} aria-label={`${label} : du`} />
        <span className="text-xs text-muted-foreground">au</span>
        <Input type="date" className="h-9 text-xs" value={to} min={from || undefined} onChange={e => onChange(from, e.target.value)} aria-label={`${label} : au`} />
      </div>
    </div>
  );
}

export default function TicketFilters({ value, onChange, options }: TicketFiltersProps) {
  const set = <K extends keyof TicketFilterState>(key: K, v: TicketFilterState[K]) => onChange({ ...value, [key]: v });

  const toggleIn = (key: "status" | "priority", v: string) =>
    set(key, value[key].includes(v) ? value[key].filter(x => x !== v) : [...value[key], v]);

  const priorities = Array.from(new Set([...PRIORITY_ORDER, ...(options?.priorities ?? [])]));
  const categoryOptions: FilterOption[] = Array.from(new Set([...Object.keys(TICKET_CATEGORY_LABELS), ...(options?.categories ?? [])]))
    .map(c => ({ value: c, label: TICKET_CATEGORY_LABELS[c] ?? c }));
  const siteOptions: FilterOption[] = (options?.sites ?? []).map(s => ({ value: s, label: s }));
  const assigneeOptions: FilterOption[] = [
    { value: "none", label: "Non attribué" },
    ...(options?.assignees ?? []).map(u => ({ value: u.id, label: u.name })),
  ];
  const creatorOptions: FilterOption[] = (options?.creators ?? []).map(u => ({ value: u.id, label: u.name }));

  return (
    <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Statut</span>
          <div className="flex flex-wrap gap-1.5">
            {TICKET_STATUSES.map(s => {
              const active = value.status.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleIn("status", s)}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                    active ? TICKET_STATUS_CONFIG[s].badgeClass + " ring-1 ring-current/20" : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", TICKET_STATUS_CONFIG[s].dotClass)} />
                  {TICKET_STATUS_CONFIG[s].label}
                </button>
              );
            })}
          </div>
          {value.status.length === 0 && (
            <p className="text-[11px] text-muted-foreground">Sans sélection, les tickets archivés sont masqués.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Priorité</span>
          <div className="flex flex-wrap gap-1.5">
            {priorities.map(p => {
              const active = value.priority.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggleIn("priority", p)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                    active ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {TICKET_PRIORITY_LABELS[p] ?? p}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MultiSelectFilter label="Catégorie" options={categoryOptions} selected={value.category} onChange={v => set("category", v)} placeholder="Toutes" />
        <MultiSelectFilter label="Site" options={siteOptions} selected={value.site} onChange={v => set("site", v)} />
        <MultiSelectFilter label="Attribué à" options={assigneeOptions} selected={value.assigneeId} onChange={v => set("assigneeId", v)} />
        <MultiSelectFilter label="Demandeur" options={creatorOptions} selected={value.creatorId} onChange={v => set("creatorId", v)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Équipement</span>
          <DebouncedInput value={value.equipment} onChange={v => set("equipment", v)} placeholder="Contient..." />
        </div>
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">N° Série</span>
          <DebouncedInput value={value.serialNumber} onChange={v => set("serialNumber", v)} placeholder="Contient..." />
        </div>
        <DateRange label="Date d'ouverture" from={value.createdFrom} to={value.createdTo} onChange={(f, t) => onChange({ ...value, createdFrom: f, createdTo: t })} />
        <DateRange label="Date de clôture" from={value.resolvedFrom} to={value.resolvedTo} onChange={(f, t) => onChange({ ...value, resolvedFrom: f, resolvedTo: t })} />
      </div>
    </div>
  );
}

interface ActiveFilterChipsProps {
  value: TicketFilterState;
  onChange: (value: TicketFilterState) => void;
  options: TicketFilterOptions | null;
}

// Libellés lisibles des filtres actifs (utilisés aussi dans l'export Excel)
export function describeFilters(value: TicketFilterState, options: TicketFilterOptions | null, search?: string): string[] {
  const labels = buildFilterChips(value, () => {}, options).map(c => c.label);
  return search ? [`Recherche : « ${search} »`, ...labels] : labels;
}

// Résumé des filtres actifs, chacun supprimable d'un clic
export function ActiveFilterChips({ value, onChange, options }: ActiveFilterChipsProps) {
  const chips = buildFilterChips(value, onChange, options);
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map(chip => (
        <span key={chip.key} className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 py-0.5 pl-2.5 pr-1 text-xs font-medium">
          {chip.label}
          <button type="button" onClick={chip.remove} className="rounded-full p-0.5 hover:bg-primary/15" aria-label={`Retirer le filtre ${chip.label}`}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => onChange(EMPTY_TICKET_FILTERS)}>
        <RotateCcw className="h-3 w-3" /> Tout effacer
      </Button>
    </div>
  );
}

function buildFilterChips(value: TicketFilterState, onChange: (v: TicketFilterState) => void, options: TicketFilterOptions | null) {
  const userName = (id: string, list?: { id: string; name: string }[]) =>
    id === "none" ? "Non attribué" : list?.find(u => u.id === id)?.name ?? id;

  const chips: { key: string; label: string; remove: () => void }[] = [];
  const listChips = (key: keyof TicketFilterState, title: string, labelOf: (v: string) => string) => {
    (value[key] as string[]).forEach(v =>
      chips.push({
        key: `${key}-${v}`,
        label: `${title} : ${labelOf(v)}`,
        remove: () => onChange({ ...value, [key]: (value[key] as string[]).filter(x => x !== v) }),
      })
    );
  };

  listChips("status", "Statut", v => TICKET_STATUS_CONFIG[v as keyof typeof TICKET_STATUS_CONFIG]?.label ?? v);
  listChips("priority", "Priorité", v => TICKET_PRIORITY_LABELS[v] ?? v);
  listChips("category", "Catégorie", v => TICKET_CATEGORY_LABELS[v] ?? v);
  listChips("site", "Site", v => v);
  listChips("assigneeId", "Attribué à", v => userName(v, options?.assignees));
  listChips("creatorId", "Demandeur", v => userName(v, options?.creators));
  if (value.equipment.trim()) chips.push({ key: "equipment", label: `Équipement : ${value.equipment}`, remove: () => onChange({ ...value, equipment: "" }) });
  if (value.serialNumber.trim()) chips.push({ key: "serial", label: `N° Série : ${value.serialNumber}`, remove: () => onChange({ ...value, serialNumber: "" }) });
  if (value.createdFrom || value.createdTo)
    chips.push({ key: "created", label: `Ouverture ${rangeLabel(value.createdFrom, value.createdTo)}`, remove: () => onChange({ ...value, createdFrom: "", createdTo: "" }) });
  if (value.resolvedFrom || value.resolvedTo)
    chips.push({ key: "resolved", label: `Clôture ${rangeLabel(value.resolvedFrom, value.resolvedTo)}`, remove: () => onChange({ ...value, resolvedFrom: "", resolvedTo: "" }) });

  return chips;
}
