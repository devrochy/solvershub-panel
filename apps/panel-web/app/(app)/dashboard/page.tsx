import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { apiFetch } from "@/lib/api/server";
import type { Dashboard } from "@/lib/api/types";
import { formatNumber, formatUsd } from "@/lib/format";

export const metadata = { title: "Resumen" };

export default async function DashboardPage() {
  const res = await apiFetch<Dashboard>("/admin/dashboard");
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudo cargar el panel: {res.error}
      </p>
    );
  }
  const d = res.data;

  const planHint =
    d.billing?.days_left !== null && d.billing?.days_left !== undefined
      ? `${d.billing.days_left} días restantes`
      : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Resumen"
        description="Estado del agente, conversaciones y consumo del negocio."
        actions={
          d.billing?.has_plan ? (
            <Badge variant={d.billing.operational ? "success" : "danger"}>
              {d.billing.plan_name}
            </Badge>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Conversaciones (7 días)" value={formatNumber(d.kpi.conversations_7d)} />
        <StatCard label="Mensajes (7 días)" value={formatNumber(d.kpi.messages_7d)} />
        <StatCard
          label="Escalaciones pendientes"
          value={formatNumber(d.kpi.pending_escalations)}
          tone={d.kpi.pending_escalations > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Costo LLM (30 días)"
          value={formatUsd(d.kpi.cost_30d)}
          tone="accent"
          hint={planHint}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estado del sistema</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-body">Agente</span>
              <Badge variant={d.bot_paused ? "danger" : "success"}>
                {d.bot_paused ? "PAUSADO" : "ACTIVO"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body">Proveedor LLM</span>
              <span className="font-mono text-xs text-headline">{d.llm_label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body">Habilidades activas</span>
              <Badge variant="accent">{d.kpi.active_plugins}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversaciones recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {d.recent.length === 0 ? (
              <p className="text-sm text-text-soft">Aún no hay conversaciones.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border-soft text-sm">
                {d.recent.map((conv) => (
                  <li key={conv.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="truncate text-headline">
                      {conv.customer_name ?? conv.external_id ?? "Cliente"}
                    </span>
                    <Badge variant={conv.status === "escalated" ? "warning" : "neutral"}>
                      {conv.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
