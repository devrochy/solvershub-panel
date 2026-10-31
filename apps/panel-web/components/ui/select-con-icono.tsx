"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type Opcion = {
  value: string;
  label: string;
  /** Icono (nodo) o texto corto (p. ej. bandera emoji). */
  icono?: ReactNode;
  descripcion?: string;
};

/**
 * Selector con icono y texto (lista desplegable accesible, sin `<select>` nativo): para el
 * rol y el indicativo del alta de colaborador. Con más de 8 opciones muestra un buscador.
 */
export function SelectConIcono({
  label,
  value,
  onChange,
  options,
  placeholder = "Elige una opción",
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Opcion[];
  placeholder?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState("");
  const conBuscador = options.length > 8;
  const visibles = filtro
    ? options.filter((o) => o.label.toLowerCase().includes(filtro.toLowerCase()))
    : options;
  const elegida = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setFiltro(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-label={`${label}: ${elegida?.label ?? placeholder}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-md border border-control-border bg-bg-deep px-3 text-sm text-headline",
            "transition-colors hover:border-border-strong focus-visible:border-focus focus-visible:outline-none",
            !elegida && "text-text-soft",
          )}
        >
          {elegida?.icono && <span className="shrink-0">{elegida.icono}</span>}
          <span className="min-w-0 flex-1 truncate text-left">{elegida?.label ?? placeholder}</span>
          <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-text-soft" />
        </button>
      </PopoverTrigger>
      <PopoverContent label={label} align="start" className="w-full max-w-[20rem] p-0">
        {conBuscador && (
          <div className="relative border-b border-border p-2">
            <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-soft" />
            <Input
              autoFocus
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar…"
              className="h-9 pl-9"
              aria-label={`Buscar en ${label}`}
            />
          </div>
        )}
        <ul role="listbox" aria-label={label} className="max-h-64 overflow-y-auto p-1">
          {visibles.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-text-soft">Sin resultados.</li>
          )}
          {visibles.map((o) => {
            const activa = o.value === value;
            return (
              <li key={o.value} role="option" aria-selected={activa}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setFiltro("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-body",
                    "hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                    activa && "text-headline",
                  )}
                >
                  {o.icono && <span className="shrink-0">{o.icono}</span>}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{o.label}</span>
                    {o.descripcion && <span className="truncate text-xs text-text-soft">{o.descripcion}</span>}
                  </span>
                  {activa && <Check aria-hidden className="h-4 w-4 shrink-0 text-link" />}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
