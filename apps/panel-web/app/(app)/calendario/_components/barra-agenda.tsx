"use client";

import { PanelLeft } from "lucide-react";

import { MuestraDeColor } from "@/components/domain/tipo-de-cita";
import { Button } from "@/components/ui/button";
import { type LeyendaAgenda } from "@/lib/calendario/agenda";
import { cn } from "@/lib/utils";

/**
 * Lo que va a la derecha de la barra del calendario (AGE-05): las agendas como interruptores de
 * color (se prenden y apagan; «Ver todas» cuando alguna está apagada) y el botón que muestra u
 * oculta la columna de las citas de hoy, solo en pantallas anchas.
 */
export function BarraAgenda({
  agendas,
  visibles,
  onAlternar,
  onVerTodas,
  hoyVisible,
  onHoy,
}: {
  /** Solo las agendas activas; con 0 o 1 no se dibuja el selector. */
  agendas: LeyendaAgenda[];
  visibles: string[];
  onAlternar: (id: string) => void;
  onVerTodas: () => void;
  hoyVisible: boolean;
  onHoy: () => void;
}) {
  const hayVarias = agendas.length >= 2;
  const ocultas = agendas.filter((a) => !visibles.includes(a.id)).length;
  return (
    <>
      {hayVarias && (
        <ul aria-label="Agendas que se ven" className="flex flex-wrap items-center gap-2">
          {agendas.map((a) => {
            const prendida = visibles.includes(a.id);
            return (
              <li key={a.id}>
                <button
                  type="button"
                  aria-pressed={prendida}
                  onClick={() => onAlternar(a.id)}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-pill border border-border px-3 text-sm transition-colors pointer-coarse:h-11 focus-visible:outline-2 focus-visible:outline-focus",
                    prendida ? "text-headline" : "text-text-soft line-through decoration-text-soft/60",
                  )}
                >
                  <MuestraDeColor color={prendida ? a.color : null} />
                  {a.name}
                </button>
              </li>
            );
          })}
          {ocultas > 0 && (
            <li>
              <Button variant="ghost" onClick={onVerTodas}>
                Ver todas
              </Button>
            </li>
          )}
        </ul>
      )}
      <Button variant="outline" aria-pressed={hoyVisible} onClick={onHoy} className="max-lg:hidden">
        <PanelLeft className="h-4 w-4" aria-hidden />
        Citas de hoy
      </Button>
    </>
  );
}
