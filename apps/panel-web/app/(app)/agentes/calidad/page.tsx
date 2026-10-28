import Link from "next/link";

import { AgentFilters } from "@/app/(app)/agentes/_components/agent-filters";
import { RechazosDelVerificador } from "@/app/(app)/agentes/calidad/_components/rechazos-del-verificador";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { KpiTile } from "@/components/ui/kpi-tile";
import { PageHeader } from "@/components/ui/page-header";
import { nombreDeProcedimiento } from "@/lib/agentes";
import { apiFetch } from "@/lib/api/server";
import type { Me, ReliabilityEvalRuns, ReliabilityResponse, ReliabilityUsage, VerifierRejections } from "@/lib/api/types";
import {
  cuenta,
  filtrosDeCalidad,
  modoA2A,
  origenDeCorrida,
  porcentaje,
  puedeMarcar,
  queryDeCalidad,
  segundos,
  tipoDeRechazo,
} from "@/lib/calidad";
import { formatDateTime, formatNumber, formatUsd } from "@/lib/format";

export const metadata = { title: "Calidad" };

type Fila<T> = T extends (infer U)[] ? U : never;
type PorAgente = Fila<ReliabilityResponse["operational"]["by_agent"]>;
type Completitud = Fila<ReliabilityResponse["completion"]>;
type FilaDeUso = Fila<ReliabilityUsage["items"]>;
type Corrida = Fila<ReliabilityEvalRuns["items"]>;

function Titulo({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="font-display text-lg font-semibold text-headline">
      {children}
    </h2>
  );
}

/**
 * Calidad del asistente (HU-AOS-29): cuánto escala, cuánto tarda y cuesta, qué rechaza el
 * verificador, cuántas tareas termina y la consistencia medida antes de publicar. Todo por período y
 * conexión. Bajo la muestra mínima las tasas salen como «—» con su aviso.
 */
export default async function CalidadPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filtros = filtrosDeCalidad(await searchParams);
  const qs = queryDeCalidad(filtros);
  const [res, rechazosRes, a2aRes, corridasRes, meRes] = await Promise.all([
    apiFetch<ReliabilityResponse>(`/admin/reliability?${qs}`),
    apiFetch<VerifierRejections>(`/admin/reliability/verifier?${qs}&limit=50`),
    apiFetch<ReliabilityUsage>(`/admin/usage?${qs}&group_by=a2a`),
    apiFetch<ReliabilityEvalRuns>(
      `/admin/evals/runs?limit=10${filtros.conexion ? `&connection_id=${filtros.conexion}` : ""}`,
    ),
    apiFetch<Me>("/admin/me"),
  ]);
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar la calidad del asistente: {res.error}
      </p>
    );
  }
  const datos = res.data;
  const op = datos.operational;
  const minimo = datos.minimum_sample ?? { turns: 20, tasks: 10 };
  const conexiones = datos.consistency.map((c) => ({ id: c.connection_id, label: c.connection }));
  const conCostos = datos.can_see_costs;

  const agenteColumns: Column<PorAgente>[] = [
    { key: "agente", header: "Agente", cell: (r) => r.name },
    { key: "turnos", header: "Turnos", align: "right", cell: (r) => <span className="tabular-nums">{formatNumber(r.turns)}</span> },
    { key: "escala", header: "Escala", align: "right", cell: (r) => <span className="tabular-nums">{porcentaje(r.escalation_rate)}</span> },
    { key: "p95", header: "p95", align: "right", cell: (r) => <span className="tabular-nums">{segundos(r.p95_ms)}</span> },
    { key: "costo", header: "Costo", align: "right", cell: (r) => <span className="tabular-nums">{formatUsd(r.cost_usd ?? 0, 4)}</span> },
  ];
  const completitudColumns: Column<Completitud>[] = [
    { key: "proc", header: "Recorrido", cell: (r) => nombreDeProcedimiento(r.procedure_id) },
    { key: "terminadas", header: "Terminadas", align: "right", cell: (r) => <span className="tabular-nums">{formatNumber(r.finished)}</span> },
    { key: "completadas", header: "Completadas", align: "right", cell: (r) => <span className="tabular-nums">{formatNumber(r.completed)}</span> },
    { key: "escaladas", header: "A una persona", align: "right", cell: (r) => <span className="tabular-nums">{formatNumber(r.escalated)}</span> },
    { key: "tasa", header: "Se completan", align: "right", cell: (r) => <span className="tabular-nums">{porcentaje(r.rate)}</span> },
  ];
  const a2aColumns: Column<FilaDeUso>[] = [
    { key: "quien", header: "Quién pide → a quién", cell: (r) => r.name },
    { key: "modo", header: "Tipo", cell: (r) => modoA2A(r.mode) },
    { key: "llamadas", header: "Ejecuciones", align: "right", cell: (r) => <span className="tabular-nums">{formatNumber(r.rows)}</span> },
    { key: "costo", header: "Costo", align: "right", cell: (r) => <span className="tabular-nums">{formatUsd(r.cost_usd ?? 0, 4)}</span> },
  ];
  const corridaColumns: Column<Corrida>[] = [
    { key: "cuando", header: "Cuándo", cell: (r) => formatDateTime(r.started_at) },
    { key: "origen", header: "Origen", cell: (r) => origenDeCorrida(r.origin) },
    { key: "version", header: "Versión", cell: (r) => (r.version ? `v${r.version}` : "—") },
    { key: "escenarios", header: "Escenarios", align: "right", cell: (r) => <span className="tabular-nums">{`${r.passed}/${r.total}`}</span> },
    { key: "pass_k", header: `Estables (pass^k)`, align: "right", cell: (r) => <span className="tabular-nums">{porcentaje(r.pass_k_average)}</span> },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Calidad"
        description="Qué tan bien atiende tu asistente: cuánto pasa a una persona, cuánto tarda y cuesta, qué corrige el verificador y cuántos recorridos termina."
        helpSection="agents"
      />

      <AgentFilters baseHref="/agentes/calidad" tab="conversaciones" dias={filtros.dias} conexion={filtros.conexion} connections={conexiones} />

      <section aria-labelledby="operacion" className="flex flex-col gap-3">
        <Titulo id="operacion">Cómo atiende</Titulo>
        <div className={`grid gap-4 sm:grid-cols-2 ${conCostos ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          <KpiTile label="Turnos atendidos" value={formatNumber(op.turns)} hint={cuenta(op.conversations, "conversación", "conversaciones")} />
          <KpiTile
            label="Pasa a una persona"
            value={porcentaje(op.escalation_rate)}
            hint={cuenta(op.escalated_conversations, "conversación escalada", "conversaciones escaladas")}
          />
          <KpiTile label="Tiempo de respuesta (p95)" value={segundos(op.p95_ms)} />
          {conCostos && (
            <KpiTile
              label="Costo por conversación"
              value={op.cost_per_conversation_usd === null ? "—" : formatUsd(op.cost_per_conversation_usd, 4)}
              hint={op.cost_usd === null ? undefined : `${formatUsd(op.cost_usd, 2)} en el período`}
              tone="accent"
            />
          )}
        </div>
        {op.turns < minimo.turns && (
          <p className="text-sh-caption text-text-soft">
            Sin datos suficientes: las tasas aparecen desde {minimo.turns} turnos en el período.
          </p>
        )}
        {op.without_outcome > 0 && (
          <p className="text-sh-caption text-text-soft">
            {op.without_outcome === 1 ? "1 turno no dejó su resultado registrado; no cuenta" : `${formatNumber(op.without_outcome)} turnos no dejaron su resultado registrado; no cuentan`}{" "}
            como bien atendidos.
          </p>
        )}
        {op.by_agent.length > 0 && (
          <DataTable
            columns={conCostos ? agenteColumns : agenteColumns.filter((c) => c.key !== "costo")}
            rows={op.by_agent}
            getRowKey={(r, i) => `${r.instance_id ?? "sin"}-${i}`}
            caption="Por agente"
          />
        )}
      </section>

      <section aria-labelledby="consistencia" className="flex flex-col gap-3">
        <div>
          <Titulo id="consistencia">Consistencia antes de publicar</Titulo>
          <p className="text-sm text-body">
            Lo que midieron las pruebas automáticas de la versión activa de cada conexión: cuántos escenarios salen bien las
            cuatro veces. No depende del período.
          </p>
        </div>
        {datos.consistency.length === 0 ? (
          <p className="text-sm text-text-soft">No hay conexiones que conversen con clientes.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {datos.consistency.map((c) => (
              <li key={c.connection_id} className="rounded-lg border border-border-soft bg-surface px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-headline">{c.connection}</span>
                  {c.version !== null && <Badge variant="neutral">v{c.version}</Badge>}
                  {c.no_data ? (
                    <Badge variant="neutral">Sin datos</Badge>
                  ) : c.below_threshold.length > 0 ? (
                    <Badge variant="warning">{c.below_threshold.length} bajo el umbral</Badge>
                  ) : (
                    <Badge variant="success">Sobre el umbral</Badge>
                  )}
                  <Link href={`/conexiones/${c.connection_id}/versiones`} className="ml-auto text-sm text-link hover:underline">
                    Versiones
                  </Link>
                </div>
                {!c.no_data && (
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {c.procedures
                      .filter((p) => p.pass_k !== null)
                      .map((p) => (
                        <li key={p.procedure_id} className="flex items-center justify-between gap-3">
                          <span className="text-body">{nombreDeProcedimiento(p.procedure_id)}</span>
                          <span className={`tabular-nums ${p.ok === false ? "text-status-warning-fg" : "text-body"}`}>
                            {porcentaje(p.pass_k)} · umbral {porcentaje(c.threshold)}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="verificador" className="flex flex-col gap-3">
        <div>
          <Titulo id="verificador">Lo que corrigió el verificador</Titulo>
          <p className="text-sm text-body">
            Respuestas que el verificador frenó por afirmar algo sin respaldo. Si un rechazo era correcto, márcalo como falso
            positivo: deja de contar.
          </p>
        </div>
        {datos.verifier.length === 0 ? (
          <p className="text-sm text-text-soft">El verificador no rechazó nada en este período.</p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-2">
              {datos.verifier.map((v) => (
                <li key={v.kind} className="rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm">
                  <span className="text-headline">{tipoDeRechazo(v.kind)}</span>{" "}
                  <span className="tabular-nums text-body">{formatNumber(v.rejections - v.false_positives)}</span>
                  {v.false_positives > 0 && (
                    <span className="text-text-soft"> ({cuenta(v.false_positives, "falso positivo", "falsos positivos")})</span>
                  )}
                </li>
              ))}
            </ul>
            {rechazosRes.ok && (
              <RechazosDelVerificador
                rechazos={rechazosRes.data.items}
                puedeMarcar={meRes.ok && puedeMarcar(meRes.data)}
                verConversaciones={datos.can_see_conversations}
              />
            )}
          </>
        )}
      </section>

      <section aria-labelledby="completitud" className="flex flex-col gap-3">
        <div>
          <Titulo id="completitud">Recorridos que termina</Titulo>
          <p className="text-sm text-body">
            De los recorridos que cerraron en el período, cuántos se completaron. La tasa aparece desde {minimo.tasks} cerrados.
          </p>
        </div>
        {datos.completion.length === 0 ? (
          <p className="text-sm text-text-soft">No cerró ningún recorrido en este período.</p>
        ) : (
          <DataTable columns={completitudColumns} rows={datos.completion} getRowKey={(r) => r.procedure_id} caption="Recorridos" />
        )}
      </section>

      {conCostos && a2aRes.ok && a2aRes.data.items.length > 0 && (
        <section aria-labelledby="a2a" className="flex flex-col gap-3">
          <Titulo id="a2a">Costo entre agentes</Titulo>
          <DataTable columns={a2aColumns} rows={a2aRes.data.items} getRowKey={(r, i) => `${r.key ?? "sin"}-${i}`} caption="Operaciones entre agentes" />
        </section>
      )}

      {corridasRes.ok && corridasRes.data.items.length > 0 && (
        <section aria-labelledby="corridas" className="flex flex-col gap-3">
          <Titulo id="corridas">Últimas pruebas automáticas</Titulo>
          <DataTable columns={corridaColumns} rows={corridasRes.data.items} getRowKey={(r) => r.id} caption="Pruebas automáticas" />
        </section>
      )}
    </div>
  );
}
