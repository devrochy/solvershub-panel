import type { ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * «Opciones avanzadas» al final de una estación (HU-UX-26, D-SPEC-52-8): una sección plegable en la misma
 * página (`<details>`, como el `Avanzado` de `pasos.tsx`), con el ícono de ajustes y una línea que dice qué
 * hay adentro. Lo técnico de la estación vive aquí y no en las preguntas. Qué va adentro lo decide cada
 * estación con el dueño; si la estación no tiene opciones, no se pone.
 */
export function OpcionesAvanzadas({
  descripcion,
  abierta,
  children,
  className,
}: {
  /** La línea visible: qué hay adentro, por ejemplo «Tools HTTP, acciones y topes por conversación.». */
  descripcion: string;
  /** Abierta al montar (por ejemplo, si hay un error adentro). */
  abierta?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details open={abierta} className={cn("group", className)}>
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-2.5 gap-y-1 rounded-sm text-sm [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2 font-medium text-link underline-offset-2 group-hover:underline">
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Opciones avanzadas
          <ChevronDown
            className="h-4 w-4 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
            aria-hidden
          />
        </span>
        <span className="text-text-soft">{descripcion}</span>
      </summary>
      <div className="mt-3 flex flex-col gap-4 rounded-md border border-border-soft px-4 py-4">{children}</div>
    </details>
  );
}
