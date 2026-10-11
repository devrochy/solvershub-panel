import Link from "next/link";

import { apiFetch } from "@/lib/api/server";
import type { MissingTemplates } from "@/lib/api/types";

/**
 * Alerta de avisos que no salieron por falta de plantilla en los últimos 7 días
 * (HU-ARCH-13, `sin_plantilla`). No muestra nada si no hay o si no hay permiso.
 */
export async function MissingTemplatesBanner() {
  const res = await apiFetch<MissingTemplates>("/admin/settings/message-templates/missing");
  if (!res.ok || res.data.total_7d === 0) return null;
  const total = res.data.total_7d;
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning p-4 text-sm"
    >
      <p className="text-body">
        {total === 1 ? "1 aviso no se envió" : `${total} avisos no se enviaron`} en los últimos 7 días:
        el cliente llevaba más de 24 horas sin escribir y el evento no tiene una plantilla aprobada.
      </p>
      <Link href="/plantillas/eventos" className="font-medium text-link underline-offset-4 hover:underline">
        Configurar plantillas por evento
      </Link>
    </div>
  );
}
