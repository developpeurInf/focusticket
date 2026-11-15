import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ChevronDown, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

// Liste déroulante à choix multiples, avec recherche quand la liste est longue
export default function MultiSelectFilter({ label, options, selected, onChange, placeholder = "Tous" }: MultiSelectFilterProps) {
  const [query, setQuery] = useState("");

  const visibleOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter(o => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
  };

  const summary = selected.length === 0
    ? placeholder
    : selected.length <= 2
      ? selected.map(v => options.find(o => o.value === v)?.label ?? v).join(", ")
      : `${selected.length} sélectionnés`;

  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <Popover onOpenChange={open => !open && setQuery("")}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between font-normal h-9",
              selected.length > 0 && "border-primary/50 bg-primary/5 font-medium"
            )}
          >
            <span className="truncate">{summary}</span>
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          {options.length > 7 && (
            <div className="relative border-b p-2">
              <SearchIcon className="absolute left-4 top-4 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Rechercher..."
                className="h-8 pl-8"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
          )}
          <div className="max-h-64 overflow-y-auto p-1">
            {visibleOptions.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">Aucune valeur</p>
            ) : (
              visibleOptions.map(option => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <Checkbox
                    checked={selected.includes(option.value)}
                    onCheckedChange={() => toggle(option.value)}
                  />
                  <span className="truncate">{option.label}</span>
                </label>
              ))
            )}
          </div>
          {selected.length > 0 && (
            <div className="border-t p-1">
              <Button variant="ghost" size="sm" className="w-full h-8 text-xs" onClick={() => onChange([])}>
                Effacer la sélection
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
