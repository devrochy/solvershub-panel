"use client";

import { Check, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { textoDeCambios } from "@/lib/ruta-de-lanzamiento";
import { cn } from "@/lib/utils";

const TEXTO = "Todo viene con lo recomendado por SolversHub";

/**
 * Línea de lo recomendado de una estación (HU-UX-24, D-SPEC-49-5): dice que todo llegó preelegido y,
 * si el dueño cambió algo, cuántos cambios lleva y ofrece «Usar lo recomendado». Los cambios los cuenta
 * `cambiosFrenteARecomendado`; volver a lo recomendado lo hace quien la usa con `onUsar`.
 */
export function BarraRecomendado({
  cambios,
  onUsar,
  className,
}: {
  cambios: number;
  onUsar: () => void;
  className?: string;
}) {
  const conCambios = cambios > 0;
  return (
    <div className={cn("flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1", className)}>
      <p className="flex items-center gap-1.5 text-sm font-medium text-status-success-fg" aria-live="polite">
        <Check className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden />
        {TEXTO}
        {conCambios && <span className="font-normal text-body"> · {textoDeCambios(cambios)}</span>}
      </p>
      {conCambios && (
        <Button variant="outline" size="sm" onClick={onUsar}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          Usar lo recomendado
        </Button>
      )}
    </div>
  );
}
