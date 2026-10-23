import { Info } from "lucide-react";

import type { SubscriptionProviderSettings } from "@/lib/api/types";

const PROPIO = "pack_subscriptions";

/**
 * Honestidad comercial (SPEC-35): mientras la cobranza no sea un segundo proveedor del contrato
 * (HU-SUB-15), esta vista solo cubre la habilidad Suscripciones. Si el negocio cobra sus planes
 * con otra, lo dice en vez de mostrar una lista vacía sin explicación.
 */
export function AvisoDeAlcance({ proveedor }: { proveedor: SubscriptionProviderSettings | null }) {
  const efectivo = proveedor?.estado === "ok" ? proveedor.efectivo : null;
  if (!efectivo || efectivo === PROPIO) return null;
  const nombre = proveedor?.habilitados.find((h) => h.id === efectivo)?.label ?? efectivo;
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-md border border-status-info-border bg-status-info-bg p-4 text-sm text-status-info-fg"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>
        Los planes de este negocio se cobran con <strong>{nombre}</strong>. Esta vista muestra las suscripciones de la
        habilidad Suscripciones; las de {nombre} todavía no aparecen aquí.
      </p>
    </div>
  );
}
