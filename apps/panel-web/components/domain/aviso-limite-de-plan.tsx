import Link from "next/link";

import { RUTA_MEJORAR_PLAN, TEXTO_MEJORAR_PLAN } from "@/lib/plan-limite";

/**
 * Aviso del 409 de tope del plan (HU-BILL-05): el mensaje de la API ya explica el límite
 * («Tu plan permite 2 agentes publicados y ya tienes 2…»); aquí se suma el camino para crecer.
 */
export function AvisoLimiteDePlan({ mensaje }: { mensaje: string }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-md bg-status-warning-bg px-3 py-2 text-sm text-status-warning-fg sm:flex-row sm:items-center sm:justify-between"
    >
      <span>{mensaje}</span>
      <Link href={RUTA_MEJORAR_PLAN} className="shrink-0 font-medium underline underline-offset-2">
        {TEXTO_MEJORAR_PLAN}
      </Link>
    </div>
  );
}
