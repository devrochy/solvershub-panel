import { CreditCard } from "lucide-react";

import { SubscribeButton } from "@/app/(app)/plan/_components/subscribe-button";
import { PAYMENT_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { IconAction } from "@/components/ui/icon-action";
import { PageHeader } from "@/components/ui/page-header";
import { UsageBar } from "@/components/ui/usage-bar";
import { apiFetch } from "@/lib/api/server";
import type { PlanResponse } from "@/lib/api/types";
import { formatCop, formatDate, formatNumber } from "@/lib/format";
import { CREDITO_SIN_MEDICION, enlaceDePago, etiquetaDeLimite, limitesOrdenados, separarConsumo } from "@/lib/plan-limite";

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
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      cell: (p) => {
        // Un pago pendiente con su checkout se puede terminar desde aquí (HU-UX-12).
        const href = enlaceDePago(p);
        return href ? (
          <IconAction tone="aprobar" label={`Pagar ${formatCop(p.amount_cop)}`} href={href}>
            <CreditCard className="h-4 w-4" aria-hidden />
          </IconAction>
        ) : null;
      },
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
                nota={credit.used === null || credit.used === undefined ? CREDITO_SIN_MEDICION : undefined}
              />
            )}
          </div>
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
