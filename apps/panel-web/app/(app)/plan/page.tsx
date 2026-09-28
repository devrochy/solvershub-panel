import { SubscribeButton } from "@/app/(app)/plan/_components/subscribe-button";
import { PAYMENT_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { UsageBar } from "@/components/ui/usage-bar";
import { apiFetch } from "@/lib/api/server";
import type { PlanResponse } from "@/lib/api/types";
import { formatCop, formatDate } from "@/lib/format";

export const metadata = { title: "Plan y consumo" };

type PaymentRow = PlanResponse["payments"][number];

export default async function PlanPage() {
  const res = await apiFetch<PlanResponse>("/admin/plan");
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudo cargar el plan: {res.error}
      </p>
    );
  }
  const { overview, usage, payments, plans } = res.data;

  const paymentColumns: Column<PaymentRow>[] = [
    { key: "plan", header: "Plan", cell: (p) => p.plan_id ?? "—" },
    { key: "monto", header: "Monto", align: "right", cell: (p) => formatCop(p.amount_cop) },
    {
      key: "estado",
      header: "Estado",
      cell: (p) => <StatusBadge value={p.status} map={PAYMENT_STATUS} />,
    },
    { key: "proveedor", header: "Proveedor", cell: (p) => <span className="text-body">{p.provider ?? "—"}</span> },
    {
      key: "fecha",
      header: "Fecha",
      cell: (p) => <span className="text-body">{formatDate(p.paid_at ?? p.created_at)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Plan y consumo" description="Suscripción, cuotas y pagos del negocio." />

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

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">Consumo del periodo</h2>
        {usage.length === 0 ? (
          <p className="text-sm text-text-soft">Sin métricas de consumo.</p>
        ) : (
          <div className="grid gap-4 rounded-lg border border-border-soft bg-surface p-5 md:grid-cols-2">
            {usage.map((metric) => (
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
            <Card key={plan.id} className={plan.current ? "ring-1 ring-accent" : undefined}>
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
                    {Object.entries(plan.limits).map(([key, value]) => (
                      <li key={key} className="flex items-center justify-between gap-3">
                        <span>{key}</span>
                        <span className="text-headline">{value ?? "∞"}</span>
                      </li>
                    ))}
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
