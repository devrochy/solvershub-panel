import { FileText, ImageIcon } from "lucide-react";

import { DetailPage } from "@/components/templates/detail-page";
import type { Miga } from "@/components/ui/breadcrumbs";
import { KpiTile } from "@/components/ui/kpi-tile";
import type { FeedbackAdjunto, FeedbackReporte } from "@/lib/api/types";
import { MOTIVOS_DE_RECHAZO, TIPOS_DE_REPORTE, creditosDelReporte, tamanoDeArchivo } from "@/lib/feedback";
import { formatDate, formatDateTime } from "@/lib/format";

import { EstadoDelReporte } from "./estado-del-reporte";

/**
 * Cuerpo del detalle: estado, fechas y créditos arriba; luego el motivo del rechazo (con «Duplicado» sin
 * enlace: el cliente nunca sabe a qué reporte apunta), la descripción y la evidencia.
 */
export function DetalleDelReporte({
  reporte,
  area,
  zona,
  migas,
}: {
  reporte: FeedbackReporte;
  area: string;
  zona: string;
  migas: Miga[];
}) {
  const aprobado = reporte.estado === "aprobado";
  return (
    <DetailPage
      header={{
        title: reporte.titulo,
        description: `${TIPOS_DE_REPORTE[reporte.tipo]} · ${area}`,
        breadcrumbs: [...migas, { label: reporte.titulo }],
      }}
      summary={
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile label="Estado" value={<EstadoDelReporte reporte={reporte} />} />
          <KpiTile label="Enviado" value={<span className="block text-base leading-snug">{formatDate(reporte.created_at, zona)}</span>} />
          <KpiTile
            label="Revisado"
            value={<span className="block text-base leading-snug">{reporte.decidido_en ? formatDate(reporte.decidido_en, zona) : "Pendiente"}</span>}
            hint={reporte.decidido_en ? formatDateTime(reporte.decidido_en, zona) : "Te avisaremos cuando lo revisemos."}
          />
          <KpiTile
            label="Créditos de regalo"
            value={creditosDelReporte(reporte)}
            hint={
              aprobado ? "Ya están en el saldo de tu negocio." : reporte.estado === "rechazado" ? undefined : "Se acreditan si lo aprobamos."
            }
          />
        </div>
      }
    >
      {reporte.estado === "rechazado" && (
        <section aria-labelledby="motivo" className="flex flex-col gap-2 rounded-lg border border-border-soft bg-surface p-4">
          <h2 id="motivo" className="text-sh-block font-display text-headline">
            Por qué no lo aprobamos
          </h2>
          {reporte.motivo_codigo && <p className="text-sm font-medium text-headline">{MOTIVOS_DE_RECHAZO[reporte.motivo_codigo]}</p>}
          {reporte.motivo && <p className="whitespace-pre-wrap text-sm text-body">{reporte.motivo}</p>}
        </section>
      )}
      <section aria-labelledby="descripcion" className="flex flex-col gap-2">
        <h2 id="descripcion" className="text-sh-block font-display text-headline">
          Lo que nos contaste
        </h2>
        <p className="whitespace-pre-wrap text-sm text-body">{reporte.descripcion}</p>
      </section>
      <section aria-labelledby="evidencia" className="flex flex-col gap-3">
        <h2 id="evidencia" className="text-sh-block font-display text-headline">
          Evidencia
        </h2>
        {reporte.adjuntos.length === 0 ? (
          <p className="text-sm text-text-soft">Sin adjuntos.</p>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {reporte.adjuntos.map((adjunto, i) => (
                <li key={adjunto.id}>
                  <Adjunto adjunto={adjunto} numero={i + 1} />
                </li>
              ))}
            </ul>
            <p className="text-xs text-text-soft">Los enlaces vencen a los 10 minutos: si uno ya no abre, recarga la página.</p>
          </>
        )}
      </section>
    </DetailPage>
  );
}

function Adjunto({ adjunto, numero }: { adjunto: FeedbackAdjunto; numero: number }) {
  const nombre = adjunto.nombre_original || `Adjunto ${numero}`;
  const imagen = adjunto.mimetype.startsWith("image/");
  return (
    <a
      href={adjunto.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col overflow-hidden rounded-md border border-border-soft bg-surface transition-colors hover:border-focus/50 focus-visible:outline-2 focus-visible:outline-focus"
    >
      <span className="flex aspect-video items-center justify-center bg-bg-deep">
        {imagen ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL firmada de vida corta: next/image no la optimiza.
          <img src={adjunto.url} alt="" className="h-full w-full object-cover" />
        ) : (
          <FileText className="h-8 w-8 text-text-soft" aria-hidden />
        )}
      </span>
      <span className="flex items-center gap-1.5 px-2 py-1.5 text-xs">
        {imagen && <ImageIcon className="h-3.5 w-3.5 shrink-0 text-text-soft" aria-hidden />}
        <span className="min-w-0 flex-1 truncate text-headline">{nombre}</span>
        <span className="shrink-0 text-text-soft">{tamanoDeArchivo(adjunto.bytes)}</span>
        <span className="sr-only">(se abre en una pestaña nueva)</span>
      </span>
    </a>
  );
}
