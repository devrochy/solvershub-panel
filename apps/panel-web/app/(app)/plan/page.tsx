import Link from "next/link";

import { CajonDePagos, CajonDePlanes } from "@/app/(app)/plan/_components/cajones";
import { SubscribeButton } from "@/app/(app)/plan/_components/subscribe-button";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Progress, type ProgressTone } from "@/components/ui/progress";
import { apiFetch } from "@/lib/api/server";
import type { Me, PlanResponse } from "@/lib/api/types";
import {
  creditoEnPalabras,
  creditoPorAgente,
  creditoPorConcepto,
  diaCorto,
  estadoDelPlan,
  precioDelPlan,
  topesEnPalabras,
  type Parte,
} from "@/lib/consumo";
import { formatCop, formatNumber } from "@/lib/format";
import { RUTA_MEJORAR_PLAN } from "@/lib/plan-limite";
import { cn } from "@/lib/utils";

export const metadata = { title: "Consumo y plan" };

const TONO_DE_BARRA: Record<string, ProgressTone> = { info: "data", warning: "warning", danger: "danger", neutral: "neutral", success: "success" };
/** Colores de series para repartir un total (tokens `data-*`), en orden. */
const SERIES = ["bg-data-1", "bg-data-2", "bg-data-3", "bg-data-4"];

/** Un total repartido en una barra con su leyenda (CYP-03). */
function Reparto({ titulo, partes, enlace }: { titulo: string; partes: Parte[]; enlace?: (i: number) => string | null }) {
  return (
    <section className="flex flex-col gap-3" aria-label={titulo}>
      <h3 className="text-sm font-medium text-headline">{titulo}</h3>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-hover" role="img" aria-label={`${titulo}: ${partes.map((p) => `${p.nombre} ${p.porcentaje} %`).join(", ")}`}>
        {partes.map((p, i) => (
          <span key={p.nombre} className={cn("h-full", SERIES[i % SERIES.length])} style={{ width: `${p.porcentaje}%` }} />
        ))}
      </div>
      <ul className="flex flex-col gap-1.5 text-sm">
        {partes.map((p, i) => {
          const href = enlace?.(i) ?? null;
          return (
            <li key={p.nombre} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", SERIES[i % SERIES.length])} aria-hidden />
                {href ? (
                  <Link href={href} className="truncate text-link hover:underline">
                    {p.nombre}
                  </Link>
                ) : (
                  <span className="truncate text-body">{p.nombre}</span>
                )}
              </span>
              <span className="shrink-0 tabular-nums text-text-soft">
                {formatNumber(Math.round(p.usado))} · {p.porcentaje} %
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Consumo y plan (rediseño B, CYP-01 a 06): una sola página con el crédito del mes, el plan y su pago,
 * en qué y en quién se va el crédito y los topes con lo que pasa al llegar. Los planes y los pagos se
 * abren en un cajón (`?ver=planes`, `?ver=pagos`). Los costos técnicos son de Plataforma.
 */
export default async function PlanPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const [sp, res, me] = await Promise.all([searchParams, apiFetch<PlanResponse>("/admin/plan"), apiFetch<Me>("/admin/me")]);
  const header = (
    <PageHeader
      title="Consumo y plan"
      description="Lo que usa tu asistente este mes y tu plan."
      helpSection="plan"
      actions={
        <Button asChild variant="outline">
          <Link href="/plan?ver=planes" scroll={false}>
            Ver planes
          </Link>
        </Button>
      }
    />
  );
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorDeCarga titulo="No pudimos cargar tu consumo" detalle={res.error} />
      </div>
    );
  }
  const { overview, usage, payments, plans, cobro, credit, plan_por_el_asistente: porElAsistente } = res.data;
  const esMaster = me.ok && me.data.role === "master";
  const pendiente = cobro?.estado === "pendiente";
  const estado = estadoDelPlan(overview, pendiente);
  const actual = plans.find((p) => p.current);
  const credito = creditoEnPalabras(credit);
  const conceptos = credito && credit?.used != null ? creditoPorConcepto(credit) : [];
  const agentes = credito && credit?.used != null ? creditoPorAgente(credit) : [];
  const topes = topesEnPalabras(usage);
  const renueva = cobro?.fin ?? credit?.period_end ?? null;

  return (
    <div className="flex flex-col gap-6">
      {header}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section aria-labelledby="credito-titulo" className="flex flex-col gap-4 rounded-lg border border-border-soft bg-surface p-5">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-text-soft">Crédito del mes</span>
            {credito ? (
              <>
                <h2 id="credito-titulo" className="font-display text-2xl font-semibold tabular-nums text-headline">
                  {credito.titulo}
                </h2>
                <p className="text-sm text-body">{credito.detalle}</p>
              </>
            ) : (
              <h2 id="credito-titulo" className="font-display text-xl font-semibold text-headline">
                Tu plan no trae crédito mensual
              </h2>
            )}
          </div>
          {credito && credit?.used != null && (
            <Progress
              label="Crédito usado"
              value={credito.porcentaje}
              valueText={`${Math.floor(credito.porcentaje)} % usado`}
              segments={[{ key: "usado", value: credito.porcentaje, label: "Usado", tone: TONO_DE_BARRA[credito.tono] ?? "data" }]}
            />
          )}
          {credito?.aviso && (
            <div
              role="status"
              className={cn(
                "flex flex-col gap-0.5 rounded-md px-3.5 py-3 text-sm",
                credito.aviso.tono === "danger" ? "bg-status-danger-bg" : "bg-status-warning-bg",
              )}
            >
              <span className={cn("font-semibold", credito.aviso.tono === "danger" ? "text-status-danger-fg" : "text-status-warning-fg")}>
                {credito.aviso.titulo}
              </span>
              <span className="text-body">
                {credito.aviso.texto}{" "}
                <Link href="/plan?ver=planes" scroll={false} className="text-link hover:underline">
                  Ver planes
                </Link>
              </span>
            </div>
          )}
        </section>

        <section aria-labelledby="plan-titulo" className="flex flex-col gap-3 rounded-lg border border-border-soft bg-surface p-5">
          <span className="text-sm text-text-soft">Tu plan</span>
          {overview?.has_plan ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="plan-titulo" className="font-display text-xl font-semibold text-headline">
                  {overview.plan_name}
                </h2>
                <Badge variant={estado.tono}>{estado.label}</Badge>
              </div>
              <p className="text-sm text-body">
                {actual ? precioDelPlan(actual) : null}
                {renueva ? `${actual ? " · " : ""}se renueva el ${diaCorto(renueva)}` : null}
              </p>
              {pendiente && cobro ? (
                porElAsistente ? (
                  <p className="text-sm text-text-soft">Paga {formatCop(cobro.monto_cop)} escribiéndole al asistente de SolversHub por WhatsApp.</p>
                ) : (
                  <SubscribeButton planId={cobro.plan_id} label={`Pagar ${formatCop(cobro.monto_cop)}`} variant="accent" />
                )
              ) : cobro?.disponible_desde ? (
                <p className="text-sm text-text-soft">Estás al día. El pago del siguiente período se habilita el {diaCorto(cobro.disponible_desde)}.</p>
              ) : null}
              <Link href="/plan?ver=pagos" scroll={false} className="self-start text-sm text-link hover:underline">
                Pagos anteriores
              </Link>
            </>
          ) : (
            <>
              <h2 id="plan-titulo" className="font-display text-xl font-semibold text-headline">
                Aún no tienes un plan
              </h2>
              <p className="text-sm text-body">Elige uno para que tu asistente responda sin límites de prueba.</p>
              <Button asChild variant="accent" className="self-start">
                <Link href="/plan?ver=planes" scroll={false}>
                  Ver planes
                </Link>
              </Button>
            </>
          )}
        </section>
      </div>

      {agentes.length > 0 && (
        <section aria-labelledby="por-agente" className="flex flex-col gap-3">
          <h2 id="por-agente" className="font-display text-lg font-semibold text-headline">
            Por agente
          </h2>
          <ul className="overflow-hidden rounded-lg border border-border-soft bg-surface">
            {agentes.map((a) => (
              <li key={a.agentId ?? "otros"} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-4 border-b border-border-soft px-4 py-3 last:border-b-0 max-sm:grid-cols-[minmax(0,1fr)_auto]">
                {a.agentId ? (
                  <Link href={`/agentes/${a.agentId}`} className="truncate font-medium text-headline hover:underline">
                    {a.nombre}
                  </Link>
                ) : (
                  <span className="truncate font-medium text-headline" title="Medios y turnos que no son de un agente">
                    {a.nombre}
                  </span>
                )}
                <Progress label={`Crédito de ${a.nombre}`} value={a.porcentaje} valueText={`${a.porcentaje} % del crédito usado`} size="sm" className="max-sm:order-last max-sm:col-span-2" />
                <span className="text-sm tabular-nums text-text-soft">
                  {formatNumber(Math.round(a.usado))} créditos · {a.porcentaje} %
                </span>
              </li>
            ))}
          </ul>
          {credit?.by_agent_truncated && <p className="text-xs text-text-soft">Se muestran los agentes que más usan.</p>}
        </section>
      )}

      <div className={cn("grid items-start gap-4", conceptos.length > 0 && "lg:grid-cols-2")}>
        {conceptos.length > 0 && (
          <div className="rounded-lg border border-border-soft bg-surface p-5">
            <Reparto titulo="En qué se usó el crédito" partes={conceptos} />
          </div>
        )}
        {topes.length > 0 && (
          <section aria-labelledby="topes" className="flex flex-col gap-4 rounded-lg border border-border-soft bg-surface p-5">
            <h3 id="topes" className="text-sm font-medium text-headline">
              Lo que incluye tu plan
            </h3>
            <ul className="flex flex-col gap-4">
              {topes.map((t) => (
                <li key={t.clave} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-headline">{t.titulo}</span>
                    <span className="tabular-nums text-body">{t.uso}</span>
                  </div>
                  {t.porcentaje !== null && (
                    <Progress
                      label={t.titulo}
                      value={t.porcentaje}
                      valueText={t.uso}
                      size="sm"
                      segments={[{ key: t.clave, value: t.porcentaje, label: t.titulo, tone: TONO_DE_BARRA[t.tono] ?? "data" }]}
                    />
                  )}
                  <span
                    className={cn(
                      "text-xs",
                      t.tono === "danger" ? "text-status-danger-fg" : t.tono === "warning" ? "text-status-warning-fg" : "text-text-soft",
                    )}
                  >
                    {t.nota}
                    {t.mejorar && (
                      <>
                        {" · "}
                        <Link href={`${RUTA_MEJORAR_PLAN}?ver=planes`} scroll={false} className="text-link hover:underline">
                          Mejorar mi plan
                        </Link>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {esMaster && (
        <p className="text-xs text-text-soft">
          Equipo de SolversHub: los costos en dólares de este negocio (IA y WhatsApp) están en{" "}
          <Link href="/costos" className="text-link hover:underline">
            Costos técnicos
          </Link>
          .
        </p>
      )}

      {sp.ver === "planes" && <CajonDePlanes planes={plans} porElAsistente={porElAsistente} />}
      {sp.ver === "pagos" && <CajonDePagos pagos={payments} planes={plans} />}
    </div>
  );
}
