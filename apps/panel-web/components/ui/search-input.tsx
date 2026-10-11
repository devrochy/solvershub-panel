"use client";

import { useEffect, useRef } from "react";
import { Loader2, Search, X } from "lucide-react";

import { useAtajos } from "@/components/shell/atajos-context";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

/**
 * Buscador con nombre accesible, botón para limpiar y atajo opcional (por ejemplo "/"
 * para enfocarlo). El atajo no se dispara mientras se escribe en otro campo.
 */
export function SearchInput({
  label,
  value,
  onChange,
  placeholder,
  shortcut,
  loading,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  shortcut?: string;
  loading?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  // Con los atajos de una tecla apagados (HU-DS-05), el atajo del buscador tampoco va.
  const atajosActivos = useAtajos()?.atajosActivos ?? true;
  const atajo = atajosActivos ? shortcut : undefined;

  useEffect(() => {
    if (!atajo) return;
    function alPulsar(e: KeyboardEvent) {
      const destino = e.target as HTMLElement | null;
      const editando = destino?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(destino?.tagName ?? "");
      if (e.key === atajo && !editando && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        ref.current?.focus();
      }
    }
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [atajo]);

  return (
    <div className={cn("relative flex items-center", className)}>
      <Search className="pointer-events-none absolute left-3 h-4 w-4 text-text-soft" aria-hidden />
      <input
        ref={ref}
        type="search"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            onChange("");
          }
        }}
        className={cn(
          "h-10 w-full rounded-md border border-control-border bg-bg-deep pl-9 pr-16 text-sm text-headline",
          "placeholder:text-text-soft transition-colors hover:border-border-strong focus-visible:border-focus",
          "[&::-webkit-search-cancel-button]:hidden",
        )}
      />
      <span className="absolute right-2 flex items-center gap-1">
        {loading && <Loader2 className="h-4 w-4 animate-spin text-text-soft" aria-label="Buscando" />}
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              ref.current?.focus();
            }}
            aria-label="Limpiar búsqueda"
            className="rounded-sm p-1 text-text-soft hover:bg-hover hover:text-headline"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : (
          atajo && <Kbd keys={[atajo]} />
        )}
      </span>
    </div>
  );
}
