"use client";

import { Plus, Settings2 } from "lucide-react";

import { LeyendaDeTipos, MuestraDeColor } from "@/components/domain/tipo-de-cita";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { inicialDeAgenda, type LeyendaAgenda, type TipoLeyenda } from "@/lib/calendario/agenda";
import { cn } from "@/lib/utils";

/**
 * Barra de la vista única de Agenda (HU-CAL-08): las agendas como chips de color (se prenden
 * y apagan, o se ve «solo esta»), la leyenda de tipos, y los accesos a crear y a los ajustes.
 */
export function BarraAgenda({
  agendas,
  visibles,
  onAlternar,
  onSolo,
  tipos,
  puedeCrear,
  onNueva,
  onAjustes,
}: {
  /** Solo las agendas activas; con 0 o 1 no se dibuja el selector. */
  agendas: LeyendaAgenda[];
  visibles: string[];
  onAlternar: (id: string) => void;
  onSolo: (id: string) => void;
  tipos: TipoLeyenda[];
  puedeCrear: boolean;
  onNueva: () => void;
  onAjustes: (() => void) | null;
}) {
  const hayVarias = agendas.length >= 2;
  const repetidos = agendas.length > 4;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {hayVarias && (
        <ul aria-label="Agendas" className="flex flex-wrap items-center gap-2">
          {agendas.map((a) => {
            const prendida = visibles.includes(a.id);
            return (
              <li key={a.id} className="inline-flex items-center overflow-hidden rounded-pill border border-border bg-surface">
                <button
                  type="button"
                  aria-pressed={prendida}
                  onClick={() => onAlternar(a.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-focus",
                    prendida ? "text-headline" : "text-text-soft line-through decoration-text-soft/60",
                  )}
                >
                  <MuestraDeColor color={prendida ? a.color : null} />
                  {repetidos && <span className="font-mono text-xs font-semibold">{inicialDeAgenda(a.name)}</span>}
                  {a.name}
                </button>
                <button
                  type="button"
                  onClick={() => onSolo(a.id)}
                  aria-label={`Ver solo ${a.name}`}
                  title={`Ver solo ${a.name}`}
                  className="border-l border-border-soft px-2 py-1 text-xs text-text-soft transition-colors hover:bg-hover hover:text-headline focus-visible:outline-2 focus-visible:outline-focus"
                >
                  Solo
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {tipos.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm">
              Tipos de cita
            </Button>
          </PopoverTrigger>
          <PopoverContent label="Tipos de cita" className="w-80">
            <LeyendaDeTipos tipos={tipos} />
          </PopoverContent>
        </Popover>
      )}

      <div className="ml-auto flex items-center gap-2">
        {puedeCrear && (
          <Button variant="accent" size="sm" onClick={onNueva}>
            <Plus className="h-4 w-4" aria-hidden /> Nueva cita
          </Button>
        )}
        {onAjustes && (
          <Button variant="outline" size="sm" onClick={onAjustes}>
            <Settings2 className="h-4 w-4" aria-hidden /> Ajustes
          </Button>
        )}
      </div>
    </div>
  );
}
