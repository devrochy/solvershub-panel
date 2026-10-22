"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Negocio = { slug: string; name: string };

/**
 * Selector de negocio del master, con el mismo lenguaje visual que el resto de selectores
 * (popover buscable). Consulta `GET /api/platform/tenants?q=` mientras se escribe.
 */
export function SelectorDeNegocio({
  label,
  id,
  value,
  nombre,
  onChange,
  placeholder = "Elige un negocio",
}: {
  label: string;
  id?: string;
  value: string;
  nombre?: string;
  onChange: (slug: string, nombre: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [opciones, setOpciones] = useState<Negocio[]>([]);
  const [cargando, setCargando] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    let activo = true;
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(async () => {
      if (!activo) return;
      setCargando(true);
      try {
        const res = await fetch(`/api/platform/tenants?q=${encodeURIComponent(consulta.trim())}`);
        const json = (await res.json().catch(() => null)) as { items?: Negocio[] } | null;
        if (activo) setOpciones(json?.items ?? []);
      } catch {
        if (activo) setOpciones([]);
      } finally {
        if (activo) setCargando(false);
      }
    }, 250);
    return () => {
      activo = false;
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [open, consulta]);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setConsulta(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-md border border-control-border bg-bg-deep px-3 text-sm text-headline",
            "transition-colors hover:border-border-strong focus-visible:border-focus focus-visible:outline-none",
            !value && "text-text-soft",
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left">{value ? nombre || value : placeholder}</span>
          <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-text-soft" />
        </button>
      </PopoverTrigger>
      <PopoverContent label={label} align="start" className="w-full max-w-[22rem] p-0">
        <div className="relative border-b border-border p-2">
          <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-soft" />
          <Input
            autoFocus
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Buscar negocio…"
            className="h-9 pl-9"
            aria-label={`Buscar en ${label}`}
          />
        </div>
        <ul role="listbox" aria-label={label} className="max-h-64 overflow-y-auto p-1">
          {cargando && (
            <li className="flex items-center gap-2 px-3 py-4 text-sm text-text-soft">
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Buscando…
            </li>
          )}
          {!cargando && opciones.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-text-soft">Sin resultados.</li>
          )}
          {!cargando &&
            opciones.map((o) => {
              const activa = o.slug === value;
              return (
                <li key={o.slug} role="option" aria-selected={activa}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.slug, o.name);
                      setOpen(false);
                      setConsulta("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-body",
                      "hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                      activa && "text-headline",
                    )}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{o.name}</span>
                      <span className="truncate font-mono text-xs text-text-soft">{o.slug}</span>
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
