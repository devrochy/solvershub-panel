import { AlertTriangle, Check, Info } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Marca de una revisión: ✓ correcta, ! por revisar, i sin dato. La acompaña siempre un texto, así
 * que el color y el ícono no son lo único que dice el estado.
 */
export function MarcaDeRevision({ ok }: { ok: boolean | null | undefined }) {
  const sinDato = ok === null || ok === undefined;
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
        sinDato ? "bg-surface-2 text-text-soft" : ok ? "bg-status-success-bg text-status-success-fg" : "bg-status-warning-bg text-status-warning-fg",
      )}
    >
      {sinDato ? <Info className="h-3.5 w-3.5" /> : ok ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
    </span>
  );
}
