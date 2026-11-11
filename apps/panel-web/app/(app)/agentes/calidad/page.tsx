import Link from "next/link";

import { AgentFilters } from "@/app/(app)/agentes/_components/agent-filters";
import { RechazosDelVerificador } from "@/app/(app)/agentes/calidad/_components/rechazos-del-verificador";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { KpiTile } from "@/components/ui/kpi-tile";
import { PageHeader } from "@/components/ui/page-header";
import { DIAS_POR_DEFECTO, nombreDeProcedimiento, respuestas } from "@/lib/agentes";
import { apiFetch } from "@/lib/api/server";
import type {
  ConnectionsConsole,
  Me,
  ReliabilityEvalRuns,
  ReliabilityResponse,
  ReliabilityUsage,
  VerifierRejections,
} from "@/lib/api/types";
import {
  conexionPorInstancia,
  cuenta,
  filtrosDeCalidad,
  modoA2A,
  origenDeCorrida,
  porcentaje,
  puedeMarcar,
  queryDeCalidad,
  rapidez,
  segundos,
  tipoDeRechazo,
  type FiltrosDeCalidad,
} from "@/lib/calidad";
import { formatDateTime, formatNumber, formatUsd } from "@/lib/format";
import { tiempoRelativo } from "@/lib/notificaciones/tipos";

export const metadata = { title: "Calidad" };

type Fila<T> = T extends (infer U)[] ? U : never;
type PorAgente = Fila<ReliabilityResponse["operational"]["by_agent"]>;
type Completitud = Fila<ReliabilityResponse["completion"]>;
type FilaDeUso = Fila<ReliabilityUsage["items"]>;
type Corrida = Fila<ReliabilityEvalRuns["items"]>;

function Titulo({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="font-display text-sh-block text-headline">
      {children}
    </h2>
  );
}

function hrefDeCalidad(f: FiltrosDeCalidad, cambios: Partial<FiltrosDeCalidad>): string {
  const qs = new URLSearchParams();
  const dias = cambios.dias ?? f.dias;
  if (dias !== DIAS_POR_DEFECTO) qs.set("dias", String(dias));
  const conexion = "conexion" in cambios ? cambios.conexion : f.conexion;
  if (conexion) qs.set("conexion", conexion);
  return `/agentes/calidad${qs.size ? `?${qs.toString()}` : ""}`;
}

/**
 * Calidad del asistente (HU-AOS-29, AGT-14): cuánto resuelve sin una persona, qué tan rápido
 * responde, qué corrige el verificador y cuántos recorridos termina, en palabras. Los dólares solo
 * para el master. Bajo la muestra mínima las tasas salen como «—» con su aviso; lo que está vacío se
 * dice en una línea.
 */
export default async function CalidadPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filtros = filtrosDeCalidad(await searchParams);
  const qs = queryDeCalidad(filtros);
  const [res, rechazosRes, a2aRes, corridasRes, meRes, consolaRes] = await Promise.all([
    apiFetch<ReliabilityResponse>(`/admin/reliability?${qs}`),
    apiFetch<VerifierRejections>(`/admin/reliability/verifier?${qs}&limit=50`),
    apiFetch<ReliabilityUsage>(`/admin/usage?${qs}&group_by=a2a`),
    apiFetch<ReliabilityEvalRuns>(
      `/admin/evals/runs?limit=10${filtros.conexion ? `&connection_id=${filtros.conexion}` : ""}`,
    ),
    apiFetch<Me>("/admin/me"),
    // De qué conexión es cada fila de «Por agente» (sin permiso de Conexiones, va solo el agente).
    apiFetch<ConnectionsConsole>("/admin/connections/console?page=1&page_size=100"),
  ]);
  const header = (acciones?: React.ReactNode) => (
    <PageHeader title="Calidad" description="Qué tan bien atiende tu asistente." helpSection="agents" actions={acciones} />
  );
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        {header()}
        <ErrorDeCarga titulo="No pudimos cargar la calidad de tu asistente" detalle={res.error} />
      </div>
    );
  }
  const datos = res.data;
  const op = datos.operational;
  const minimo = datos.minimum_sample ?? { turns: 20, tasks: 10 };
  // Las conexiones que conversan; sin pruebas de consistencia, las de la consola.
  const conexiones =
    datos.consistency.length > 0
      ? datos.consistency.map((c) => ({ id: c.connection_id, label: c.connection }))
      : consolaRes.ok
        ? consolaRes.data.items.filter((c) => c.agents.length > 0).map((c) => ({ id: c.id, label: c.label.trim() }))
        : [];
  // Los dólares son de proveedor: solo el master (el dueño ve créditos en Consumo y plan).
  const conCostos = datos.can_see_costs && meRes.ok && meRes.data.role === "master";
  const deInstancia = conexionPorInstancia(consolaRes.ok ? consolaRes.data.items : []);
  const nombreConConexion = (r: PorAgente) => {
    const conexion = r.instance_id ? deInstancia.get(r.instance_id) : undefined;
    return conexion ? `${r.name} · ${conexion}` : r.name;
  };
  const resueltas = op.escalation_rate === null ? null : 1 - op.escalation_rate;

  const agenteColumns: Column<PorAgente>[] = [
    { key: "agente", header: "Agente y conexión", cell: (r) => <span className="font-medium text-headline">{nombreConConexion(r)}</span> },
    { key: "respuestas", header: "Respuestas", align: "right", cell: (r) => <span className="tabular-nums">{formatNumber(r.turns)}</span> },
    { key: "escala", header: "Pasa a una persona", align: "right", cell: (r) => <span className="tabular-nums">{porcentaje(r.escalation_rate)}</span> },
    { key: "rapidez", header: "Rapidez", cell: (r) => rapidez(r.p95_ms) },
    { key: "costo", header: "Costo", align: "right", cell: (r) => <span className="tabular-nums">{formatUsd(r.cost_usd ?? 0, 4)}</span> },
  ];
  const completitudColumns: Column<Completitud>[] = [
    { key: "proc", header: "Recorrido", cell: (r) => nombreDeProcedimiento(r.procedure_id) },
    { key: "terminadas", header: "Cerrados", align: "right", cell: (r) => <span className="tabular-nums">{formatNumber(r.finished)}</span> },
    { key: "completadas", header: "Completos", align: "right", cell: (r) => <span className="tabular-nums">{formatNumber(r.completed)}</span> },
    { key: "escaladas", header: "A una persona", align: "right", cell: (r) => <span className="tabular-nums">{formatNumber(r.escalated)}</span> },
    { key: "tasa", header: "Se completan", align: "right", cell: (r) => <span className="tabular-nums">{porcentaje(r.rate)}</span> },
  ];
  const a2aColumns: Column<FilaDeUso>[] = [
    { key: "quien", header: "Quién pide → a quién", cell: (r) => r.name },
    { key: "modo", header: "Tipo", cell: (r) => modoA2A(r.mode) },
    { key: "llamadas", header: "Veces", align: "right", cell: (r) => <span className="tabular-nums">{formatNumber(r.rows)}</span> },
    { key: "costo", header: "Costo", align: "right", cell: (r) => <span className="tabular-nums">{formatUsd(r.cost_usd ?? 0, 4)}</span> },
  ];
  const corridaColumns: Column<Corrida>[] = [
    { key: "cuando", header: "Cuándo", cell: (r) => (r.started_at ? <span title={formatDateTime(r.started_at)}>{tiempoRelativo(r.started_at)}</span> : "—") },
    { key: "origen", header: "Por qué", cell: (r) => origenDeCorrida(r.origin) },
    { key: "escenarios", header: "Casos bien", align: "right", cell: (r) => <span className="tabular-nums">{`${r.passed} de ${r.total}`}</span> },
    { key: "pass_k", header: "Salen bien siempre", align: "right", cell: (r) => <span className="tabular-nums">{porcentaje(r.pass_k_average)}</span> },
  ];

  const hayVerificador = datos.verifier.length > 0;
  const hayRecorridos = datos.completion.length > 0;
  const hayCorridas = corridasRes.ok && corridasRes.data.items.length > 0;
  const vacios = [
    !hayVerificador && "correcciones del verificador",
    !hayRecorridos && "recorridos cerrados",
    !hayCorridas && "pruebas automáticas",
  ].filter((v): v is string => Boolean(v));

  return (
    <div className="flex flex-col gap-8">
      {header(
        <AgentFilters
          dias={filtros.dias}
          hrefDias={(dias) => hrefDeCalidad(filtros, { dias })}
          conexion={filtros.conexion}
          connections={conexiones}
          hrefConexion={(conexion) => hrefDeCalidad(filtros, { conexion })}
        />,
      )}

      <section aria-labelledby="operacion" className="flex flex-col gap-3">
        <Titulo id="operacion">Cómo atiende</Titulo>
        <div className={`grid gap-4 sm:grid-cols-2 ${conCostos ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          <KpiTile
            label="Resueltas sin una persona"
            value={porcentaje(resueltas)}
            hint={`${cuenta(op.escalated_conversations, "conversación pasó", "conversaciones pasaron")} a una persona, de ${formatNumber(op.conversations)}`}
          />
          <KpiTile label="Rapidez" value={segundos(op.p95_ms)} hint="9 de cada 10 respuestas tardan menos" />
          <KpiTile label="Respuestas" value={formatNumber(op.turns)} hint={`en ${cuenta(op.conversations, "conversación", "conversaciones")}`} />
          {conCostos && (
            <KpiTile
              label="Costo por conversación"
              value={op.cost_per_conversation_usd === null ? "—" : formatUsd(op.cost_per_conversation_usd, 4)}
              hint={op.cost_usd === null ? undefined : `${formatUsd(op.cost_usd, 2)} en el período · solo lo ves tú`}
              tone="accent"
            />
          )}
        </div>
        {op.turns < minimo.turns && (
          <p className="text-sh-caption text-text-soft">
            Todavía son pocas: los porcentajes aparecen desde {respuestas(minimo.turns)} en el período.
          </p>
        )}
        {op.without_outcome > 0 && (
          <p className="text-sh-caption text-text-soft">
            {op.without_outcome === 1
              ? "1 respuesta no dejó registrado cómo terminó; no cuenta"
              : `${formatNumber(op.without_outcome)} respuestas no dejaron registrado cómo terminaron; no cuentan`}{" "}
            como bien atendidas.
          </p>
        )}
        {op.by_agent.length > 0 && (
          <TablaResponsiva
            etiqueta="Por agente y conexión"
            columns={conCostos ? agenteColumns : agenteColumns.filter((c) => c.key !== "costo")}
            rows={op.by_agent}
            getRowKey={(r, i) => `${r.instance_id ?? "sin"}-${i}`}
            caption="Por agente y conexión"
            filaCelular={(r) => ({
              titulo: nombreConConexion(r),
              detalle: `${respuestas(r.turns)} · ${rapidez(r.p95_ms)}`,
              fin: porcentaje(r.escalation_rate),
            })}
          />
        )}
      </section>

      {datos.consistency.length > 0 && (
        <section aria-labelledby="consistencia" className="flex flex-col gap-3">
          <div>
            <Titulo id="consistencia">Pruebas antes de publicar</Titulo>
            <p className="text-sm text-body">
              Cada versión se prueba antes de atender: cuántos casos salen bien las cuatro veces. No depende del período.
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {datos.consistency.map((c) => (
              <li key={c.connection_id} className="rounded-lg border border-border-soft bg-surface px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-headline">{c.connection}</span>
                  {c.no_data ? (
                    <Badge variant="neutral">Sin pruebas</Badge>
                  ) : c.below_threshold.length > 0 ? (
                    <Badge variant="warning">{cuenta(c.below_threshold.length, "recorrido por debajo", "recorridos por debajo")}</Badge>
                  ) : (
                    <Badge variant="success">Como se espera</Badge>
                  )}
                  <Link href={`/conexiones/${c.connection_id}/versiones`} className="ml-auto text-sm text-link hover:underline">
                    Ver versiones<span className="sr-only"> de {c.connection}</span>
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
                            {porcentaje(p.pass_k)} · se espera {porcentaje(c.threshold)}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {hayVerificador && (
        <section aria-labelledby="verificador" className="flex flex-col gap-3">
          <div>
            <Titulo id="verificador">Lo que corrigió el verificador</Titulo>
            <p className="text-sm text-body">
              Respuestas que se frenaron por afirmar algo sin respaldo. Si una estaba bien, márcala como falsa alarma: deja de
              contar.
            </p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {datos.verifier.map((v) => (
              <li key={v.kind} className="rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm">
                <span className="text-headline">{tipoDeRechazo(v.kind)}</span>{" "}
                <span className="tabular-nums text-body">{formatNumber(v.rejections - v.false_positives)}</span>
                {v.false_positives > 0 && (
                  <span className="text-text-soft"> ({cuenta(v.false_positives, "falsa alarma", "falsas alarmas")})</span>
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
        </section>
      )}

      {hayRecorridos && (
        <section aria-labelledby="completitud" className="flex flex-col gap-3">
          <div>
            <Titulo id="completitud">Recorridos que termina</Titulo>
            <p className="text-sm text-body">
              De los recorridos que cerraron en el período, cuántos se completaron. El porcentaje aparece desde {minimo.tasks}{" "}
              cerrados.
            </p>
          </div>
          <DataTable columns={completitudColumns} rows={datos.completion} getRowKey={(r) => r.procedure_id} caption="Recorridos" />
        </section>
      )}

      {conCostos && a2aRes.ok && a2aRes.data.items.length > 0 && (
        <section aria-labelledby="a2a" className="flex flex-col gap-3">
          <Titulo id="a2a">Costo entre agentes</Titulo>
          <DataTable columns={a2aColumns} rows={a2aRes.data.items} getRowKey={(r, i) => `${r.key ?? "sin"}-${i}`} caption="Lo que se piden los agentes" />
        </section>
      )}

      {hayCorridas && corridasRes.ok && (
        <section aria-labelledby="corridas" className="flex flex-col gap-3">
          <Titulo id="corridas">Últimas pruebas automáticas</Titulo>
          <DataTable columns={corridaColumns} rows={corridasRes.data.items} getRowKey={(r) => r.id} caption="Pruebas automáticas" />
        </section>
      )}

      {vacios.length > 0 && (
        <p className="text-sh-caption text-text-soft">
          Sin {vacios.length === 1 ? vacios[0] : `${vacios.slice(0, -1).join(", ")} ni ${vacios.at(-1)}`} en este período.
        </p>
      )}
    </div>
  );
}
