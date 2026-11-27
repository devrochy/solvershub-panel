"use client";

import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";

export type EstacionResumida<Id extends string> = { id: Id; titulo: string; resumen: string };

/**
 * «¿Todo quedó como querías?» (estación 5, HU-UX-31, tablero `E5S`): las estaciones ya hechas, cada una con lo
 * que quedó y «Cambiar», que vuelve a ella sin perder nada. El ✓ va con la palabra «hecha» para el lector: el
 * estado nunca va solo por el color.
 */
export function ResumenDeEstaciones<Id extends string>({
  estaciones,
  onEditar,
}: {
  estaciones: readonly EstacionResumida<Id>[];
  onEditar: (id: Id) => void;
}) {
  return (
    <ol aria-label="Lo que ya está listo" className="flex flex-col gap-2">
      {estaciones.map((e) => (
        <li
          key={e.id}
          className="flex items-center gap-3 rounded-lg border border-border-soft bg-surface px-4 py-3"
        >
          <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-focus text-surface">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
          <p className="min-w-0 flex-1 text-sm text-body">
            <span className="font-semibold text-headline">{e.titulo}</span>
            <span className="sr-only"> (hecha)</span> <span className="text-text-soft">{e.resumen}</span>
          </p>
          <Button variant="ghost" size="sm" onClick={() => onEditar(e.id)} aria-label={`Cambiar ${e.titulo}`}>
            Cambiar
          </Button>
        </li>
      ))}
    </ol>
  );
}
