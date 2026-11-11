import { notFound, redirect } from "next/navigation";

import { AccionesCron } from "@/app/(app)/plataforma/crons/_components/acciones-cron";
import { CRON_RUN_STATUS, CRON_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { DetailPage } from "@/components/templates/detail-page";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { KpiTile } from "@/components/ui/kpi-tile";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type { Cron, CronEjecucion, CronEjecucionesPage, Me } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import {
  DISPARADOR_LABEL,
  SIN_EXITOS,
  atraso,
  describirCron,
  distanciaRelativa,
  formatDuracion,
  motivoDeOmision,
  puedeOperarCrons,
} from "@/lib/crons";

export const metadata = { title: "Cron" };

const ESTADOS_DE_EJECUCION = ["success", "failed", "running", "skipped"];
const DISPARADORES = ["scheduled", "manual"];

type Filtros = { page?: string; status?: string; trigger?: string };

function enlace(name: string, sp: Filtros, page: number): string {
  const qs = new URLSearchParams();
  if (sp.status) qs.set("status", sp.status);
  if (sp.trigger) qs.set("trigger", sp.trigger);
  qs.set("page", String(page));
  return `/plataforma/crons/${encodeURIComponent(name)}?${qs.toString()}`;
}

/** Plataforma → Crons → un cron: su estado, el horario, las acciones y el historial de ejecuciones (ADR-0183). */
export default async function CronDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<Filtros>;
}) {
  const { name } = await params;
  const sp = await searchParams;
  const qs = new URLSearchParams();
  const pagina = Math.min(1000, Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1));
  qs.set("page", String(pagina));
  if (sp.status && ESTADOS_DE_EJECUCION.includes(sp.status)) qs.set("status", sp.status);
  if (sp.trigger && DISPARADORES.includes(sp.trigger)) qs.set("trigger", sp.trigger);

  const ruta = `/admin/platform/crons/${encodeURIComponent(name)}`;
  const [me, res, ejecuciones] = await Promise.all([
    apiFetch<Me>("/admin/me"),
    apiFetch<Cron>(ruta),
    apiFetch<CronEjecucionesPage>(`${ruta}/runs?${qs.toString()}`),
  ]);
  // PLT-04: sin permiso no hay página de error; un cron que no existe es 404.
  if (!me.ok || !puedeOperarCrons(me.data) || (!res.ok && res.status === 403)) redirect("/dashboard");
  if (!res.ok) {
    if (res.status === 404) notFound();
    return <ErrorDeCarga titulo="No pudimos cargar el cron" detalle={res.error} />;
  }
  const tarde = atraso(res.data);
  const c = res.data;
  const { items, page, has_more, total } = ejecuciones.ok
    ? ejecuciones.data
    : { items: [] as CronEjecucion[], page: 1, has_more: false, total: 0 };

  const columns: Column<CronEjecucion>[] = [
    { key: "inicio", header: "Inicio", cell: (r) => <span className="tabular-nums">{formatDateTime(r.started_at)}</span> },
    { key: "estado", header: "Resultado", cell: (r) => <StatusBadge value={r.status} map={CRON_RUN_STATUS} /> },
    { key: "disparo", header: "Disparo", cell: (r) => DISPARADOR_LABEL[r.trigger] },
    {
      key: "duracion",
      header: "Duración",
      align: "right",
      cell: (r) => <span className="tabular-nums">{formatDuracion(r.duration_ms)}</span>,
    },
    {
      key: "detalle",
      header: "Detalle",
      cell: (r) =>
        r.status === "failed" ? (
          // PLT-10: la falla en palabras; la clase de la excepción, en el detalle técnico.
          <span className="flex flex-col gap-0.5">
            <span className="text-body">{r.detail?.trim() || "Falló sin mensaje: revisa los logs del worker."}</span>
            {r.error_class && (
              <details className="text-xs text-text-soft">
                <summary className="cursor-pointer">Ver detalle técnico</summary>
                <span className="font-mono">{r.error_class}</span>
              </details>
            )}
          </span>
        ) : r.status === "skipped" ? (
          motivoDeOmision(r.detail)
        ) : (
          "—"
        ),
    },
  ];

  return (
    <DetailPage
      header={{
        title: c.label,
        description: c.description || c.name,
        actions: <AccionesCron cron={c} />,
      }}
      summary={
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile label="Estado" value={<StatusBadge value={c.estado} map={CRON_STATUS} />} hint={c.module} />
          <KpiTile
            label="Horario"
            value={<span className="block text-base leading-snug">{describirCron(c.schedule, c.interval_s)}</span>}
            hint={c.overridden ? `Reprogramado. El del código: ${describirCron(c.default_schedule, c.interval_s)}` : (c.schedule ?? undefined)}
          />
          <KpiTile
            label="Próxima ejecución"
            value={c.paused ? "En pausa" : tarde ? `Atrasado ${tarde}` : distanciaRelativa(c.next_run_at)}
            tone={tarde ? "danger" : "default"}
            hint={
              tarde
                ? `Debía correr el ${formatDateTime(c.next_run_at)}: revisa que el planificador esté corriendo.`
                : c.next_run_at
                  ? formatDateTime(c.next_run_at)
                  : undefined
            }
          />
          <KpiTile
            label="Últimas 24 h"
            value={c.runs_24h}
            tone={c.failures_24h > 0 ? "danger" : "default"}
            hint={c.failures_24h > 0 ? `${c.failures_24h} con fallo` : "Sin fallos"}
          />
        </div>
      }
    >
      {(c.critical || c.sensitive) && (
        <p
          role="note"
          className="flex flex-wrap items-center gap-2 rounded-md border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-fg"
        >
          {c.critical && <Badge variant="warning">Crítico</Badge>}
          {c.critical ? "No se puede pausar: la plataforma depende de él. " : ""}
          {c.sensitive ? "Este cron cobra o escribe a clientes: cambiarlo o ejecutarlo a mano tiene efectos reales." : ""}
        </p>
      )}
      <section aria-labelledby="historial" className="flex flex-col gap-3">
        <h2 id="historial" className="text-sh-block font-display text-headline">
          Historial de ejecuciones
        </h2>
        {!c.record_success && (
          <p role="note" className="text-sm text-body">
            {SIN_EXITOS}
          </p>
        )}
        <DataTable
          columns={columns}
          rows={items}
          getRowKey={(r) => r.id}
          emptyTitle={c.record_success ? "Sin ejecuciones todavía" : "Sin fallos ni ejecuciones manuales"}
          emptyDescription={
            c.record_success
              ? "Cuando el cron corra, cada ejecución quedará anotada aquí por 30 días."
              : "Este cron no guarda las ejecuciones exitosas."
          }
          error={ejecuciones.ok ? null : `No se pudo cargar el historial: ${ejecuciones.error}`}
          caption={`Ejecuciones de ${c.label}`}
          serverPaginated
        />
        {ejecuciones.ok && (
          <Pagination page={page} hasMore={has_more} total={total} label="ejecuciones" singular="ejecución" makeHref={(p) => enlace(c.name, sp, p)} />
        )}
      </section>
    </DetailPage>
  );
}
