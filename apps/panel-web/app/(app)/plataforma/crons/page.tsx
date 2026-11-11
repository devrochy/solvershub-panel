import { redirect } from "next/navigation";

import { FiltrosDeCrons } from "@/app/(app)/plataforma/crons/_components/filtros";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { CRON_RUN_STATUS, CRON_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { ListPage } from "@/components/templates/list-page";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api/server";
import type { Cron, CronListado, Me } from "@/lib/api/types";
import {
  SIN_EXITOS,
  agruparPorModulo,
  atraso,
  consultaCrons,
  describirCron,
  distanciaRelativa,
  puedeOperarCrons,
  resumenDeCrons,
  resumenDeGrupo,
  type FiltrosCrons,
} from "@/lib/crons";

export const metadata = { title: "Crons" };


/**
 * Plataforma → Crons (ADR-0183 de agent-core): las tareas periódicas de la plataforma clasificadas por
 * módulo, con su estado, la última y la próxima ejecución. Desde el detalle de cada una se ejecuta,
 * pausa, reanuda y reprograma. Solo el master: un tester actúa como master en otras herramientas, pero
 * no gestiona la plataforma.
 */
export default async function CronsPage({ searchParams }: { searchParams: Promise<FiltrosCrons & { vista?: string }> }) {
  const sp = await searchParams;
  const [me, lista] = await Promise.all([
    apiFetch<Me>("/admin/me"),
    apiFetch<CronListado>(`/admin/platform/crons${consultaCrons(sp)}`),
  ]);
  // PLT-04: quien no puede operar crons no ve una página de error.
  if (!me.ok || !puedeOperarCrons(me.data) || (!lista.ok && lista.status === 403)) redirect("/dashboard");
  const header = { title: "Crons", helpSection: "crons" };
  if (!lista.ok) {
    return (
      <ListPage header={header}>
        <ErrorDeCarga titulo="No pudimos cargar los crons" detalle={lista.error} />
      </ListPage>
    );
  }

  const ahora = new Date();
  const todos = lista.data.items;
  const visibles = sp.vista === "atrasados" ? todos.filter((c) => atraso(c, ahora) !== null) : todos;
  const grupos = agruparPorModulo(visibles, lista.data.modules);
  const activos = todos.filter((c) => !c.paused && c.next_run_at);
  // Si todos los que deberían correr están atrasados, el que no corre es el planificador.
  const planificadorDetenido = activos.length > 0 && activos.every((c) => atraso(c, ahora) !== null);
  const hrefDe = (c: Cron) => `/plataforma/crons/${encodeURIComponent(c.name)}`;

  const columns: Column<Cron>[] = [
    {
      key: "cron",
      header: "Cron",
      cell: (c) => (
        <div className="flex min-w-0 flex-col">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-headline">{c.label}</span>
            {c.critical && <Badge variant="warning">Crítico</Badge>}
            {c.sensitive && <Badge variant="info">Toca clientes</Badge>}
          </span>
          <span className="font-mono text-xs text-text-soft">{c.name}</span>
        </div>
      ),
    },
    { key: "estado", header: "Estado", cell: (c) => <span className="whitespace-nowrap"><StatusBadge value={c.estado} map={CRON_STATUS} /></span> },
    {
      key: "horario",
      header: "Horario",
      cell: (c) => (
        <div className="flex flex-col">
          <span className="text-body">{describirCron(c.schedule, c.interval_s)}</span>
          {c.overridden && (
            <span className="text-xs text-status-warning-fg">Reprogramado · el del código: {describirCron(c.default_schedule, c.interval_s)}</span>
          )}
        </div>
      ),
    },
    {
      key: "ultima",
      header: "Última",
      cell: (c) =>
        c.last_run ? (
          <div className="flex flex-col items-start gap-1">
            <StatusBadge value={c.last_run.status} map={CRON_RUN_STATUS} />
            <span className="text-xs text-text-soft">{distanciaRelativa(c.last_run.started_at, ahora)}</span>
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
      cell: (c) => <Proxima cron={c} ahora={ahora} />,
    },
    {
      key: "fallos",
      header: <span className="whitespace-nowrap">Fallos en 24 h</span>,
      align: "right",
      cell: (c) => (
        <span className={c.failures_24h > 0 ? "tabular-nums text-status-danger-fg" : "tabular-nums text-text-soft"}>{c.failures_24h}</span>
      ),
    },
  ];

  return (
    <ListPage header={header} filters={<FiltrosDeCrons sp={sp} />}>
      <p className="text-sm text-body">{resumenDeCrons(todos, ahora)}</p>
      {planificadorDetenido && (
        <p role="status" className="rounded-md border border-status-danger-border bg-status-danger-bg px-4 py-3 text-sm text-status-danger-fg">
          Ningún cron corre a tiempo: el planificador parece detenido desde hace {atraso(activos[0], ahora)}. Revisa que el
          servicio de tareas periódicas (beat) esté corriendo.
        </p>
      )}
      {grupos.length === 0 && (
        <EmptyState title="Ningún cron coincide" description="Prueba con otra búsqueda o con «Todos»." />
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
            <TablaResponsiva
              etiqueta={`Crons de ${g.module}`}
              caption={`Crons de ${g.module}`}
              columns={columns}
              rows={g.crons}
              getRowKey={(c) => c.name}
              getRowHref={hrefDe}
              getRowLabel={(c) => `Abrir ${c.label}`}
              filaCelular={(c) => ({
                titulo: c.label,
                detalle: atraso(c, ahora) ? `Atrasado ${atraso(c, ahora)}` : describirCron(c.schedule, c.interval_s),
                fin: <StatusBadge value={c.estado} map={CRON_STATUS} />,
                href: hrefDe(c),
              })}
            />
          </section>
        );
      })}
    </ListPage>
  );
}

/** Próxima ejecución: en pausa, atrasada (PLT-10) o «en 3 h». */
function Proxima({ cron, ahora }: { cron: Cron; ahora: Date }) {
  if (cron.paused) return <span className="text-text-soft">En pausa</span>;
  const tarde = atraso(cron, ahora);
  if (tarde) return <Badge variant="danger" className="whitespace-nowrap">Atrasado {tarde}</Badge>;
  return <span className="tabular-nums">{distanciaRelativa(cron.next_run_at, ahora)}</span>;
}
