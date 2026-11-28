import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AccionesDeRevision } from "@/components/domain/feedback/acciones-de-revision";
import { AdjuntosDeReporte } from "@/components/domain/feedback/adjuntos-de-reporte";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { StatusBadge, estadoLegible } from "@/components/domain/status-badge";
import { DetailPage } from "@/components/templates/detail-page";
import { KpiTile } from "@/components/ui/kpi-tile";
import { apiFetch, getBusinessTimezone } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";
import type { FeedbackReporteMaster, Me } from "@/lib/api/types";
import {
  FEEDBACK_STATUS,
  MOTIVO_LABEL,
  TIPO_LABEL,
  antiguedad,
  decideReportes,
  enlaceDeBandeja,
  esUuid,
  nombreDePersona,
  veBandejaDeReportes,
} from "@/lib/feedback-revision";
import { formatDateTime, formatNumber } from "@/lib/format";

export const metadata = { title: "Reporte de cliente" };

/**
 * Plataforma → Reportes de clientes → un reporte (ADR-0213): lo que escribió el cliente, su evidencia,
 * la nota interna y la decisión. El master lo toma, lo aprueba con créditos de regalo o lo rechaza; el
 * tester lo ve sin acciones.
 */
export default async function ReporteDeClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!esUuid(id)) notFound();
  const [me, res, catalogo, zona] = await Promise.all([
    apiFetch<Me>("/admin/me"),
    apiFetch<FeedbackReporteMaster>(`/platform/feedback/reports/${id}`),
    apiFetch<components["schemas"]["FeedbackCatalogo"]>("/feedback/catalogo"),
    getBusinessTimezone(),
  ]);
  if (!me.ok || !veBandejaDeReportes(me.data) || (!res.ok && res.status === 403)) redirect("/dashboard");
  if (!res.ok) {
    if (res.status === 404) notFound();
    return <ErrorDeCarga titulo="No pudimos cargar el reporte" detalle={res.error} />;
  }
  const r = res.data;
  const area = (catalogo.ok ? catalogo.data.areas.find((a) => a.clave === r.area)?.etiqueta : undefined) ?? estadoLegible(r.area);
  const decide = decideReportes(me.data);

  return (
    <DetailPage
      header={{
        title: r.titulo,
        description: `${TIPO_LABEL[r.tipo]} · ${area} · ${r.tenant_name || "Sin nombre"}`,
        actions: decide ? <AccionesDeRevision reporte={r} /> : undefined,
      }}
      summary={
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile
            label="Estado"
            value={<StatusBadge value={r.estado} map={FEEDBACK_STATUS} />}
            hint={r.revisor ? `${r.estado === "en_revision" ? "Lo tomó" : "Lo decidió"} ${nombreDePersona(r.revisor)}` : "Sin tomar"}
          />
          <KpiTile
            label="Negocio"
            value={
              <Link href={enlaceDeBandeja({}, { tenant_id: r.tenant_id })} className="block text-base leading-snug text-link hover:underline">
                {r.tenant_name || "Sin nombre"}
              </Link>
            }
            hint="Ver sus otros reportes"
          />
          <KpiTile
            label="Autor"
            value={<span className="block break-words text-base leading-snug">{nombreDePersona(r.autor)}</span>}
            hint={r.autor.nombre?.trim() ? (r.autor.email ?? undefined) : undefined}
          />
          <KpiTile label="Recibido" value={<span className="block text-base leading-snug">{antiguedad(r.created_at)}</span>} hint={formatDateTime(r.created_at, zona)} />
        </div>
      }
    >
      {!decide && (r.estado === "recibido" || r.estado === "en_revision") && (
        <p role="note" className="rounded-md border border-border-soft bg-surface-raised px-4 py-3 text-sm text-body">
          Puedes ver el reporte, pero solo el master lo toma, lo aprueba o lo rechaza.
        </p>
      )}

      <Decision reporte={r} zona={zona} />

      <section aria-labelledby="descripcion" className="flex flex-col gap-2">
        <h2 id="descripcion" className="text-sh-block font-display text-headline">
          Lo que escribió el cliente
        </h2>
        <p className="whitespace-pre-wrap break-words text-sm text-body">{r.descripcion}</p>
      </section>

      <section aria-labelledby="adjuntos" className="flex flex-col gap-2">
        <h2 id="adjuntos" className="text-sh-block font-display text-headline">
          Evidencia
        </h2>
        <AdjuntosDeReporte reporteId={r.id} adjuntos={r.adjuntos} />
      </section>

      <section aria-labelledby="nota-interna" className="flex flex-col gap-2">
        <h2 id="nota-interna" className="text-sh-block font-display text-headline">
          Nota interna
        </h2>
        <p className="text-xs text-text-soft">Solo la ve el equipo de SolversHub.</p>
        <p className="whitespace-pre-wrap break-words text-sm text-body">{r.nota_interna?.trim() || "Sin nota interna."}</p>
      </section>

      <p className="font-mono text-xs text-text-soft">Id del reporte: {r.id}</p>
    </DetailPage>
  );
}

/** La decisión tomada: los créditos regalados o el motivo del rechazo (con el original, si es duplicado). */
function Decision({ reporte: r, zona }: { reporte: FeedbackReporteMaster; zona: string }) {
  if (r.estado === "aprobado") {
    return (
      <p role="status" className="rounded-md border border-status-success-border bg-status-success-bg px-4 py-3 text-sm text-status-success-fg">
        Aprobado{r.decidido_en ? ` el ${formatDateTime(r.decidido_en, zona)}` : ""}: {formatNumber(r.creditos_otorgados ?? 0)} créditos de regalo para{" "}
        {r.tenant_name || "el negocio"}.
      </p>
    );
  }
  if (r.estado === "rechazado") {
    return (
      <div role="status" className="flex flex-col gap-1 rounded-md border border-border-soft bg-surface-raised px-4 py-3 text-sm text-body">
        <p className="font-medium text-headline">
          Rechazado{r.motivo_codigo ? `: ${MOTIVO_LABEL[r.motivo_codigo]}` : ""}
          {r.decidido_en ? ` · ${formatDateTime(r.decidido_en, zona)}` : ""}
        </p>
        {r.motivo && <p>El cliente ve: «{r.motivo}»</p>}
        {r.duplicado_de && (
          <p>
            Duplica a{" "}
            <Link href={`/plataforma/feedback/${r.duplicado_de}`} className="font-mono text-link hover:underline">
              {r.duplicado_de}
            </Link>
          </p>
        )}
      </div>
    );
  }
  return null;
}
