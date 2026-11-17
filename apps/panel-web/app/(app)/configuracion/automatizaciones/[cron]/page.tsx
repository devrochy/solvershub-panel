import Link from "next/link";
import { notFound } from "next/navigation";

import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { CRON_RUN_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch, getBusinessTimezone } from "@/lib/api/server";
import type {
  Automatizacion,
  CronNegocioEjecucion,
  CronNegocioEjecucionesPage,
} from "@/lib/api/types";
import { formatDuracion } from "@/lib/crons";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Historial de la automatización" };

type Filtros = { page?: string; status?: string };
const ESTADOS = ["success", "failed", "skipped"];

function enlace(cron: string, sp: Filtros, page: number): string {
  const qs = new URLSearchParams({ page: String(page) });
  if (sp.status) qs.set("status", sp.status);
  return `/configuracion/automatizaciones/${encodeURIComponent(cron)}?${qs.toString()}`;
}

/**
 * Historial de una automatización del negocio (ADR-0200): solo ejecuciones con efecto, fallos y
 * manuales. Los barridos sin efecto no dejan fila; la tarjeta muestra el último resumen.
 */
export default async function HistorialAutomatizacionPage({
  params,
  searchParams,
}: {
  params: Promise<{ cron: string }>;
  searchParams: Promise<Filtros>;
}) {
  const { cron } = await params;
  const sp = await searchParams;
  const pagina = Math.min(1000, Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1));
  const qs = new URLSearchParams({ page: String(pagina) });
  if (sp.status && ESTADOS.includes(sp.status)) qs.set("status", sp.status);
  const ruta = `/admin/automatizaciones/${encodeURIComponent(cron)}`;
  const [detalle, ejecuciones, zona] = await Promise.all([
    apiFetch<Automatizacion>(ruta),
    apiFetch<CronNegocioEjecucionesPage>(`${ruta}/runs?${qs.toString()}`),
    getBusinessTimezone(),
  ]);
  const volver = (
    <Link href="/configuracion/automatizaciones" className="text-sm font-medium text-focus underline-offset-4 hover:underline">
      ← Volver a Automatizaciones
    </Link>
  );
  if (!detalle.ok) {
    if (detalle.status === 404) notFound();
    return (
      <div className="flex flex-col gap-6">
        {volver}
        <ErrorDeCarga titulo="No pudimos cargar la automatización" detalle={detalle.error} />
      </div>
    );
  }
  const item = detalle.data;
  const columns: Column<CronNegocioEjecucion>[] = [
    {
      key: "inicio",
      header: "Inicio",
      cell: (r) => <span className="whitespace-nowrap tabular-nums">{formatDateTime(r.started_at, zona)}</span>,
    },
    { key: "estado", header: "Estado", cell: (r) => <StatusBadge value={r.status} map={CRON_RUN_STATUS} /> },
    {
      key: "disparador",
      header: "Disparador",
      cell: (r) => <span className="text-body">{r.trigger === "manual" ? "Manual" : "Programada"}</span>,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (r) => <span className="tabular-nums">{r.acciones}</span>,
    },
    {
      key: "resumen",
      header: "Qué hizo",
      cell: (r) => (
        <span className="text-body">{r.resumen ?? r.error_class ?? r.detail ?? "—"}</span>
      ),
    },
    {
      key: "duracion",
      header: "Duración",
      align: "right",
      cell: (r) => <span className="tabular-nums text-text-soft">{r.duration_ms !== null ? formatDuracion(r.duration_ms) : "—"}</span>,
    },
  ];
  return (
    <div className="flex flex-col gap-6">
      {volver}
      <PageHeader title={item.label} description={item.description} helpSection="settings" />
      {!ejecuciones.ok ? (
        <ErrorDeCarga titulo="No pudimos cargar el historial" detalle={ejecuciones.error} />
      ) : (
        <section className="flex flex-col gap-4" aria-label="Historial de ejecuciones">
          <DataTable
            columns={columns}
            rows={ejecuciones.data.items}
            getRowKey={(r) => r.id}
            emptyTitle="Sin ejecuciones con efecto"
            emptyDescription="Cuando la automatización envíe algo, cobre o falle, quedará aquí por 90 días."
          />
          {ejecuciones.data.total > 0 && (
            <Pagination
              page={ejecuciones.data.page}
              hasMore={ejecuciones.data.has_more}
              total={ejecuciones.data.total}
              label="ejecuciones"
              singular="ejecución"
              makeHref={(p) => enlace(cron, sp, p)}
            />
          )}
        </section>
      )}
    </div>
  );
}
