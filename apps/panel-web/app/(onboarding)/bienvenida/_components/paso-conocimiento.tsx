"use client";

import Link from "next/link";
import { CheckCircle2, CircleDashed, ExternalLink } from "lucide-react";

import type { PasoPrimerosPasos } from "@/lib/api/types";
import { CONTENIDO } from "@/lib/primeros-pasos";
import { TIPOS_DE_NEGOCIO, type EstadoDelAsistente } from "@/lib/onboarding";

/**
 * Paso 4: lo que el agente sabe. No duplica formularios (SPEC-39): muestra lo que ya hay cargado y enlaza a
 * la pantalla que lo resuelve, que se abre aparte para no perder el recorrido. Se puede seguir sin cargar nada.
 */
export function PasoConocimiento({
  estado,
  contenido,
}: {
  estado: EstadoDelAsistente;
  /** Paso de contenido de `GET /admin/onboarding` (catálogo, servicios o cartera), si el negocio lo trae. */
  contenido: PasoPrimerosPasos | null;
}) {
  const tipo = TIPOS_DE_NEGOCIO.find((t) => t.id === estado.tipo);
  const clase = tipo?.contenido ?? null;
  const copia = clase ? CONTENIDO[clase] : null;
  const cantidad = contenido?.cantidad ?? 0;
  const hecho = contenido?.estado === "completo" || cantidad > 0;

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <p className="text-body">
        Tu agente responde con lo que tú le cargas. Nunca inventa precios, citas ni deudas: si algo falta, lo dice y pasa a una persona.
      </p>
      {copia ? (
        <div className="flex items-start gap-4 rounded-lg border border-border-soft bg-surface p-4">
          {hecho ? (
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-status-success-fg" aria-hidden />
          ) : (
            <CircleDashed className="mt-0.5 h-6 w-6 shrink-0 text-text-soft" aria-hidden />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="font-display font-semibold text-headline">{copia.titulo}</p>
            <p className="text-sm text-body">{copia.descripcion}</p>
            <p className="text-sm text-text-soft" role="status">
              {hecho
                ? `${cantidad} ${cantidad === 1 ? copia.unidad[0] : copia.unidad[1]}.`
                : "Aún no hay nada cargado. Puedes seguir y hacerlo después."}
            </p>
            <Link
              href={copia.href}
              target="_blank"
              rel="noopener"
              className="mt-1 inline-flex min-h-11 items-center gap-2 self-start text-link underline underline-offset-2"
            >
              {hecho ? "Revisar" : copia.accion}
              <ExternalLink className="h-4 w-4" aria-hidden />
              <span className="sr-only">(se abre en otra pestaña)</span>
            </Link>
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-border-soft bg-surface p-4 text-sm text-body">
          Para este tipo de negocio no hace falta cargar nada ahora. Los planes y los clientes los gestionas desde su sección cuando quieras.
        </p>
      )}
    </div>
  );
}
