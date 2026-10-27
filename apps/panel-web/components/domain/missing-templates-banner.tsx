import Link from "next/link";

import { apiFetch } from "@/lib/api/server";
import type { MissingTemplates } from "@/lib/api/types";
import { desglosarFaltantes } from "@/lib/plantillas";

const ENLACE = "font-medium text-link underline-offset-4 hover:underline";

/**
 * Alerta de avisos que no salieron por falta de plantilla en los últimos 7 días
 * (HU-ARCH-13, `sin_plantilla`; SPEC-40 para las plantillas con opciones). Separa los avisos de un evento de
 * los mensajes con opciones, porque se arreglan en pantallas distintas. No muestra nada si no hay o si no hay permiso.
 */
export async function MissingTemplatesBanner() {
  const res = await apiFetch<MissingTemplates>("/admin/settings/message-templates/missing");
  if (!res.ok || res.data.total_7d === 0) return null;
  const { eventos, opciones, clavesDeOpciones } = desglosarFaltantes(res.data);
  if (eventos + opciones === 0) return null;
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-md border border-warning p-4 text-sm">
      {eventos > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3" data-origen="eventos">
          <p className="text-body">
            {eventos === 1 ? "1 aviso no se envió" : `${eventos} avisos no se enviaron`} en los últimos 7 días:
            el cliente llevaba más de 24 horas sin escribir y el evento no tiene una plantilla aprobada.
          </p>
          <Link href="/plantillas/eventos" className={ENLACE}>
            Configurar plantillas por evento
          </Link>
        </div>
      )}
      {opciones > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3" data-origen="opciones">
          <p className="text-body">
            {opciones === 1 ? "1 mensaje con opciones no se envió" : `${opciones} mensajes con opciones no se enviaron`} en los últimos 7 días:
            el cliente llevaba más de 24 horas sin escribir y la plantilla con opciones no tiene una plantilla de Meta aprobada.
            {clavesDeOpciones.length > 0 && <> Plantillas: {clavesDeOpciones.join(", ")}.</>}
          </p>
          <Link href="/plantillas-opciones" className={ENLACE}>
            Ver plantillas con opciones
          </Link>
        </div>
      )}
    </div>
  );
}
