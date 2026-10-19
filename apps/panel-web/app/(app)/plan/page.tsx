import { SubscribeButton } from "@/app/(app)/plan/_components/subscribe-button";
import { PAYMENT_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { UsageBar } from "@/components/ui/usage-bar";
import { apiFetch } from "@/lib/api/server";
import type { PlanResponse } from "@/lib/api/types";
import { formatCop, formatDate, formatNumber } from "@/lib/format";
import {
  avisoDeCredito,
  CREDITO_SIN_MEDICION,
  desgloseDeCredito,
  etiquetaDeLimite,
  formatoCreditos,
  limitesOrdenados,
  separarConsumo,
} from "@/lib/plan-limite";

export const metadata = { title: "Plan y consumo" };

type PaymentRow = PlanResponse["payments"][number];

/** Por dónde entró cada pago del plan (HU-SH-04): el asistente de SolversHub o este panel. */
const CANAL_DEL_PAGO: Record<string, string> = {
  asistente: "Asistente",
  wompi: "Panel",
  plataforma: "Cobro de renovación",
};

export default async function PlanPage() {
  const res = await apiFetch<PlanResponse>("/admin/plan");
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar el plan: {res.error}
      </p>
    );
  }
  const { overview, usage, payments, plans, cobro, credit, plan_por_el_asistente: planPorElAsistente } = res.data;
  // Lo que vende el plan (D-35): agentes publicados, colaboradores y crédito mensual, primero.
  const { delPlan, resto } = separarConsumo(usage);
  // Crédito mensual medido (HU-BILL-04/06): aviso al 80 % y al 100 %, sin bloquear.
  const creditoMedido = credit != null && credit.used != null;
  const reinicio = credit?.period_end ? formatDate(credit.period_end) : undefined;
  const aviso = avisoDeCredito(credit, reinicio);
  const desglose = desgloseDeCredito(credit);
  const porAgente = (credit?.by_agent ?? []).filter((a) => a.used > 0);

  const paymentColumns: Column<PaymentRow>[] = [
    { key: "plan", header: "Plan", cell: (p) => p.plan_id ?? "—" },
    {
      key: "periodo",
      header: "Período",
      cell: (p) => <span className="font-mono text-xs text-body">{p.periodo ?? "—"}</span>,
    },
    { key: "monto", header: "Monto", align: "right", cell: (p) => formatCop(p.amount_cop) },
    {
      key: "estado",
      header: "Estado",
      cell: (p) => <StatusBadge value={p.status} map={PAYMENT_STATUS} />,
    },
    {
      key: "proveedor",
      header: "Canal",
      cell: (p) => (
        <span className="text-body">{p.provider ? (CANAL_DEL_PAGO[p.provider] ?? p.provider) : "—"}</span>
      ),
    },
    {
      key: "fecha",
      header: "Fecha",
      cell: (p) => <span className="text-body">{formatDate(p.paid_at ?? p.created_at)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Plan y consumo" description="Suscripción, cuotas y pagos del negocio."   helpSection="plan"
        />

      <Card>
        <CardHeader>
          <CardTitle>Plan actual</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4 text-sm">
          {overview?.has_plan ? (
            <>
              <span className="text-headline">{overview.plan_name}</span>
              <Badge variant={overview.operational ? "success" : "danger"}>{overview.status}</Badge>
              {overview.days_left !== null && overview.days_left !== undefined && (
                <span className="text-body">{overview.days_left} días restantes</span>
              )}
            </>
          ) : (
            <span className="text-body">Sin suscripción activa.</span>
          )}
        </CardContent>
      </Card>

      {cobro && (
        <Card>
          <CardHeader>
            <CardTitle>Período del plan</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-headline">{cobro.referencia}</span>
              <span className="text-body">
                {formatDate(cobro.inicio)} – {formatDate(cobro.fin)}
              </span>
              <span className="text-headline">{formatCop(cobro.monto_cop)}</span>
              {cobro.estado === "pagado" ? (
                <Badge variant="success">
                  {cobro.pagado_por === "asistente" ? "Pagado por el asistente" : "Pagado"}
                </Badge>
              ) : (
                <Badge variant="warning">Pendiente</Badge>
              )}
            </div>
            {cobro.estado === "pendiente" ? (
              <div className="max-w-xs">
                <SubscribeButton planId={cobro.plan_id} label="Pagar el período" />
              </div>
            ) : (
              cobro.disponible_desde && (
                <p className="text-text-soft">
                  Tu plan está al día. El cobro del período siguiente se habilita el{" "}
                  {formatDate(cobro.disponible_desde)}.
                </p>
              )
            )}
          </CardContent>
        </Card>
      )}

      {(delPlan.length > 0 || credit) && (
        <section className="flex flex-col gap-3" aria-labelledby="incluye-titulo">
          <h2 id="incluye-titulo" className="font-display text-lg font-semibold text-headline">
            Lo que incluye tu plan
          </h2>
          <div className="grid gap-4 rounded-lg border border-border-soft bg-surface p-5 md:grid-cols-3">
            {delPlan.map((metric) => (
              <UsageBar
                key={metric.key}
                label={metric.label}
                used={metric.used}
                limit={metric.limit}
                percent={metric.percent}
                unit={metric.unit}
                exceeded={metric.exceeded}
              />
            ))}
            {credit && (
              <UsageBar
                label="Crédito mensual"
                used={credit.used ?? null}
                limit={credit.limit}
                percent={credit.percent ?? null}
                unit="créditos"
                exceeded={(credit.percent ?? 0) >= 100}
                nota={
                  creditoMedido
                    ? `1 crédito = COP 10${reinicio ? ` · se renueva el ${reinicio}` : ""}`
                    : CREDITO_SIN_MEDICION
                }
              />
            )}
          </div>
          {aviso && (
            <div
              role="status"
              className={
                aviso.nivel === "agotado"
                  ? "flex flex-col gap-1 rounded-lg border border-status-danger-border bg-status-danger-bg p-4 text-sm"
                  : "flex flex-col gap-1 rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm"
              }
            >
              <span
                className={
                  aviso.nivel === "agotado"
                    ? "font-semibold text-status-danger-fg"
                    : "font-semibold text-status-warning-fg"
                }
              >
                {aviso.titulo}
              </span>
              <span className="text-body">{aviso.texto}</span>
            </div>
          )}
          {creditoMedido && (desglose.length > 0 || porAgente.length > 0) && (
            <div className="grid gap-4 rounded-lg border border-border-soft bg-surface p-5 text-sm md:grid-cols-2">
              {desglose.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-headline">En qué se usó el crédito</h3>
                  <ul className="flex flex-col gap-1 text-body" aria-label="Crédito por concepto">
                    {desglose.map((d) => (
                      <li key={d.concepto} className="flex items-center justify-between gap-3">
                        <span>{d.concepto}</span>
                        <span className="text-headline">{formatoCreditos(d.usado)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {porAgente.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-headline">Por agente</h3>
                  <ul className="flex flex-col gap-1 text-body" aria-label="Crédito por agente">
                    {porAgente.map((a) => (
                      <li key={a.agent_id ?? "sin-agente"} className="flex items-center justify-between gap-3">
                        <span>{a.name ?? "Sin agente (medios y turnos anteriores)"}</span>
                        <span className="text-headline">{formatoCreditos(a.used)}</span>
                      </li>
                    ))}
                  </ul>
                  {credit?.by_agent_truncated && (
                    <p className="text-xs text-text-soft">Se muestran los agentes con más consumo.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">Consumo del periodo</h2>
        {resto.length === 0 ? (
          <p className="text-sm text-text-soft">Sin métricas de consumo.</p>
        ) : (
          <div className="grid gap-4 rounded-lg border border-border-soft bg-surface p-5 md:grid-cols-2">
            {resto.map((metric) => (
              <UsageBar
                key={metric.key}
                label={metric.label}
                used={metric.used}
                limit={metric.limit}
                percent={metric.percent}
                unit={metric.unit}
                exceeded={metric.exceeded}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">Planes disponibles</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={plan.current ? "ring-1 ring-focus" : undefined}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.current && <Badge variant="accent">Actual</Badge>}
                </div>
                <p className="font-display text-xl font-bold text-headline">
                  {plan.is_free ? "Gratis" : formatCop(plan.price_cop)}
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {Object.keys(plan.limits).length > 0 && (
                  <ul className="flex flex-col gap-1 text-xs text-body">
                    {limitesOrdenados(plan.limits).map(([key, value]) => (
                      <li key={key} className="flex items-center justify-between gap-3">
                        <span>{etiquetaDeLimite(key)}</span>
                        <span className="text-headline">{value ?? "∞"}</span>
                      </li>
                    ))}
                    {plan.monthly_credits != null && (
                      <li className="flex items-center justify-between gap-3">
                        <span>Crédito mensual</span>
                        <span className="text-headline">{formatNumber(plan.monthly_credits)}</span>
                      </li>
                    )}
                  </ul>
                )}
                {Object.keys(plan.features).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(plan.features)
                      .filter(([, value]) => value)
                      .map(([key, value]) => (
                        <Badge key={key} variant="neutral">
                          {typeof value === "string" ? value : key}
                        </Badge>
                      ))}
                  </div>
                )}
                {!plan.is_free &&
                  (plan.current ? (
                    <p className="text-sm text-text-soft">Tu plan actual</p>
                  ) : planPorElAsistente ? (
                    <p className="text-sm text-text-soft">
                      Para cambiar de plan, escríbele al asistente de SolversHub por WhatsApp.
                    </p>
                  ) : (
                    <SubscribeButton planId={plan.id} />
                  ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">Pagos</h2>
        <DataTable
          columns={paymentColumns}
          rows={payments}
          getRowKey={(p, index) => `${p.plan_id}-${index}`}
          emptyTitle="Sin pagos registrados"
        />
      </section>
    </div>
  );
}
