import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/server";
import type { MissingTemplates } from "@/lib/api/types";
import { desglosarFaltantes } from "@/lib/plantillas";

/**
 * Alerta de avisos que no salieron por falta de plantilla en los últimos 7 días
 * (HU-ARCH-13, `sin_plantilla`; SPEC-40 para las plantillas con opciones). Separa los avisos de un evento de
 * los mensajes con opciones, porque se arreglan en pantallas distintas; en la pantalla de cada uno no se
 * enlaza a sí misma (`enLaPagina`). No muestra nada si no hay o si no hay permiso.
 */
export async function MissingTemplatesBanner({ enLaPagina }: { enLaPagina?: "eventos" | "opciones" } = {}) {
  const res = await apiFetch<MissingTemplates>("/admin/settings/message-templates/missing");
  if (!res.ok || res.data.total_7d === 0) return null;
  const { eventos, opciones, clavesDeOpciones } = desglosarFaltantes(res.data);
  if (eventos + opciones === 0) return null;
  return (
    <div role="alert" className="flex gap-3 rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm">
      <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-fg" />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {eventos > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3" data-origen="eventos">
            <p className="text-headline">
              <strong className="font-semibold">{eventos === 1 ? "1 aviso no se envió" : `${eventos} avisos no se enviaron`} esta semana.</strong>{" "}
              <span className="text-body">El cliente llevaba más de 24 horas sin escribir y el evento no tiene una plantilla aprobada.</span>
            </p>
            {enLaPagina !== "eventos" && (
              <Button asChild variant="outline" size="sm">
                <Link href="/plantillas/eventos">Revisar los avisos por evento</Link>
              </Button>
            )}
          </div>
        )}
        {opciones > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3" data-origen="opciones">
            <p className="text-headline">
              <strong className="font-semibold">
                {opciones === 1 ? "1 mensaje con opciones no se envió" : `${opciones} mensajes con opciones no se enviaron`} esta semana.
              </strong>{" "}
              <span className="text-body">
                El cliente llevaba más de 24 horas sin escribir y la plantilla con opciones no tiene una plantilla de Meta aprobada.
                {clavesDeOpciones.length > 0 && <> Plantillas: {clavesDeOpciones.join(", ")}.</>}
              </span>
            </p>
            {enLaPagina !== "opciones" && (
              <Button asChild variant="outline" size="sm">
                <Link href="/plantillas-opciones">Ver las plantillas con opciones</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
