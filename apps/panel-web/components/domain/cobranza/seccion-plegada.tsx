import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { formatNumber } from "@/lib/format";

/** Historial que no hace falta a diario: plegado, con cuántos registros hay. */
export function SeccionPlegada({
  titulo,
  conteo,
  abierta = false,
  nivel: Titulo = "h2",
  children,
}: {
  titulo: string;
  conteo: number;
  abierta?: boolean;
  /** El nivel real del título en la página. */
  nivel?: "h2" | "h3";
  children: ReactNode;
}) {
  return (
    <details open={abierta} className="group rounded-lg border border-border-soft bg-surface">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-headline transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden className="h-4 w-4 text-text-soft transition-transform group-open:rotate-90 motion-reduce:transition-none" />
        <Titulo className="text-sm font-medium">{titulo}</Titulo>
        <span className="tabular-nums text-text-soft">({formatNumber(conteo)})</span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}
