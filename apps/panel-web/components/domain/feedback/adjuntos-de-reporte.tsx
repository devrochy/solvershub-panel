import { ExternalLink, FileText } from "lucide-react";

import type { FeedbackAdjuntoMaster } from "@/lib/api/types";
import { tamano } from "@/lib/feedback-revision";

/**
 * Evidencia de un reporte: vista previa de las imágenes y de los PDF con su URL firmada del backend.
 * La firma dura 10 minutos desde que se cargó la página: pasado ese tiempo, recargar la renueva.
 */
export function AdjuntosDeReporte({ adjuntos }: { adjuntos: FeedbackAdjuntoMaster[] }) {
  if (adjuntos.length === 0) return <p className="text-sm text-text-soft">El reporte no trae adjuntos.</p>;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-text-soft">Los enlaces de los adjuntos vencen a los 10 minutos. Si alguno no abre, recarga la página.</p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {adjuntos.map((a, i) => {
          const nombre = a.nombre_original?.trim() || `Adjunto ${i + 1}`;
          const esPdf = a.mimetype === "application/pdf";
          return (
            <li key={a.id} className="flex flex-col gap-2 rounded-md border border-border-soft bg-surface p-3">
              {esPdf ? (
                <iframe src={a.url} title={`Vista previa de ${nombre}`} className="h-72 w-full rounded-sm border border-border-soft bg-bg-deep" />
              ) : (
                <a href={a.url} target="_blank" rel="noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element -- evidencia privada con URL firmada de corta duración */}
                  <img src={a.url} alt={`Captura: ${nombre}`} className="max-h-72 w-full rounded-sm border border-border-soft bg-bg-deep object-contain" />
                </a>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-1 text-body">
                  {esPdf && <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                  <span className="truncate">{nombre}</span>
                  <span className="shrink-0 text-text-soft">· {tamano(a.bytes)}</span>
                </span>
                <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-link hover:underline">
                  Abrir
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  <span className="sr-only">{nombre} en otra pestaña</span>
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
