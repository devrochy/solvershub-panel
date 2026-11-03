import Link from "next/link";
import { Eye } from "lucide-react";

import { FiltrosDeCrons } from "@/app/(app)/plataforma/crons/_components/filtros";
import { CRON_RUN_STATUS, CRON_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { ListPage } from "@/components/templates/list-page";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { IconAction } from "@/components/ui/icon-action";
import { KpiTile } from "@/components/ui/kpi-tile";
import { apiFetch } from "@/lib/api/server";
import type { Cron, CronListado, CronResumen, Me } from "@/lib/api/types";
import {
  SIN_EXITOS,
  agruparPorModulo,
  consultaCrons,
  describirCron,
  distanciaRelativa,
  puedeOperarCrons,
  resumenDeGrupo,
  type FiltrosCrons,
} from "@/lib/crons";

export const metadata = { title: "Crons" };

const SOLO_MASTER = "Solo el admin de plataforma puede ver esto.";

/**
 * Plataforma → Crons (ADR-0183 de agent-core): las tareas periódicas de la plataforma clasificadas por
 * módulo, con su estado, la última y la próxima ejecución. Desde el detalle de cada una se ejecuta,
 * pausa, reanuda y reprograma. Solo el master: un tester actúa como master en otras herramientas, pero
 * no gestiona la plataforma.
 */
export default async function CronsPage({ searchParams }: { searchParams: Promise<FiltrosCrons> }) {
  const sp = await searchParams;
  const [me, lista, resumen] = await Promise.all([
    apiFetch<Me>("/admin/me"),
    apiFetch<CronListado>(`/admin/platform/crons${consultaCrons(sp)}`),
    apiFetch<CronResumen>("/admin/platform/crons/summary"),
  ]);
  if (!me.ok || !puedeOperarCrons(me.data)) {
    return (
      <p role="alert" className="text-status-danger-fg">
        {SOLO_MASTER}
      </p>
    );
  }
  if (!lista.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        {lista.status === 403 ? SOLO_MASTER : `No se pudieron cargar los crons: ${lista.error}`}
      </p>
    );
  }

  const modulos = lista.data.modules;
  const grupos = agruparPorModulo(lista.data.items, modulos);
  const r = resumen.ok ? resumen.data : null;

  const columns: Column<Cron>[] = [
    {
      key: "cron",
      header: "Cron",
      cell: (c) => (
        <div className="flex min-w-0 flex-col">
          <Link href={`/plataforma/crons/${encodeURIComponent(c.name)}`} className="font-medium text-link hover:underline">
            {c.label}
          </Link>
          <span className="font-mono text-xs text-text-soft">{c.name}</span>
          {(c.critical || c.sensitive) && (
            <span className="mt-1 flex flex-wrap gap-1">
              {c.critical && <Badge variant="warning">Crítico</Badge>}
              {c.sensitive && <Badge variant="accent">Cobra o avisa a clientes</Badge>}
            </span>
          )}
        </div>
      ),
    },
    { key: "estado", header: "Estado", cell: (c) => <StatusBadge value={c.estado} map={CRON_STATUS} /> },
    {
      key: "horario",
      header: "Horario",
      info: "Cuándo corre. Las horas están en UTC; se indica también la hora de Colombia.",
      cell: (c) => (
        <div className="flex flex-col">
          <span className="text-body">{describirCron(c.schedule, c.interval_s)}</span>
          {c.overridden && (
            <span className="text-xs text-status-warning-fg">
              Reprogramado (el del código: {describirCron(c.default_schedule, c.interval_s)})
            </span>
          )}
        </div>
      ),
    },
    {
      key: "ultima",
      header: "Última ejecución",
      cell: (c) =>
        c.last_run ? (
          <div className="flex flex-col items-start gap-1">
            <StatusBadge value={c.last_run.status} map={CRON_RUN_STATUS} />
            <span className="text-xs text-text-soft">{distanciaRelativa(c.last_run.started_at)}</span>
          </div>
        ) : (
          <span className="text-text-soft" title={c.record_success ? undefined : SIN_EXITOS}>
            {c.record_success ? "Nunca" : "Sin historial"}
          </span>
        ),
    },
    {
      key: "proxima",
      header: "Próxima",
      cell: (c) => <span className="tabular-nums">{c.paused ? "Pausado" : distanciaRelativa(c.next_run_at)}</span>,
    },
    {
      key: "fallos",
      header: "Fallos 24 h",
      align: "right",
      cell: (c) => (
        <span className={c.failures_24h > 0 ? "tabular-nums text-status-danger-fg" : "tabular-nums text-text-soft"}>
          {c.failures_24h}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <IconAction href={`/plataforma/crons/${encodeURIComponent(c.name)}`} label={`Ver historial de ${c.label}`} tone="ver">
            <Eye className="h-4 w-4" aria-hidden />
          </IconAction>
        </div>
      ),
    },
  ];

  return (
    <ListPage
      header={{
        title: "Crons",
        description: "Las tareas periódicas de la plataforma por módulo: su estado, el historial de ejecuciones y cómo operarlas.",
      }}
      filters={<FiltrosDeCrons sp={sp} modulos={modulos} />}
    >
      {r && (
        <section aria-label="Resumen" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile label="Crons" value={r.total} hint={r.ejecutando > 0 ? `${r.ejecutando} ejecutándose ahora` : undefined} />
          <KpiTile label="Activos" value={r.activos} tone="success" />
          <KpiTile label="Pausados" value={r.pausados} tone={r.pausados > 0 ? "warning" : "default"} />
          <KpiTile label="Con fallo" value={r.con_fallo} tone={r.con_fallo > 0 ? "danger" : "default"} hint="Su última ejecución falló" />
        </section>
      )}
      {grupos.length === 0 && (
        <DataTable
          columns={columns}
          rows={[]}
          getRowKey={(c) => c.name}
          emptyTitle="Sin crons"
          emptyDescription="Ningún cron coincide con los filtros."
          caption="Crons"
        />
      )}
      {grupos.map((g, i) => {
        const { conFallo, pausados } = resumenDeGrupo(g.crons);
        const id = `modulo-${i}`;
        return (
          <section key={g.module} aria-labelledby={id} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 id={id} className="text-sh-block font-display text-headline">
                {g.module}
              </h2>
              <span className="text-sm text-text-soft">
                {g.crons.length} {g.crons.length === 1 ? "cron" : "crons"}
                {conFallo > 0 && ` · ${conFallo} con fallo`}
                {pausados > 0 && ` · ${pausados} en pausa`}
              </span>
            </div>
            <DataTable columns={columns} rows={g.crons} getRowKey={(c) => c.name} caption={`Crons de ${g.module}`} />
          </section>
        );
      })}
    </ListPage>
  );
}
