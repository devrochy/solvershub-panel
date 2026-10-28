import { cookies } from "next/headers";

import { Bienvenida } from "@/components/domain/bienvenida";
import { MissingTemplatesBanner } from "@/components/domain/missing-templates-banner";
import { CONVERSATION_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ResumenAgentes } from "@/components/dashboard/resumen-agentes";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { apiFetch } from "@/lib/api/server";
import type { Dashboard, Me, PrimerosPasos, ResumenPorAgente } from "@/lib/api/types";
import { formatNumber, formatUsd } from "@/lib/format";
import { PASOS_PLEGADOS_COOKIE, hayPasosParaActuar } from "@/lib/primeros-pasos";
import { TOUR_COOKIE, debeOfrecerTour } from "@/lib/tour";

export const metadata = { title: "Resumen" };

const DESCRIPCION = "Estado del agente, conversaciones y consumo del negocio.";

/** Un colaborador con solo «Resumen» recibe el bloque vacío: ahí se muestran las cifras de siempre. */
function tieneResumen(r: ResumenPorAgente): boolean {
  return r.general.kpis.length > 0 || r.agentes.some((a) => a.kpis.length > 0 || a.modulos.length > 0);
}

export default async function DashboardPage() {
  // `/admin/me` ya lo pidió el layout: el fetch se memoiza en el mismo render.
  const [meRes, res, pasosRes, agentesRes] = await Promise.all([
    apiFetch<Me>("/admin/me"),
    apiFetch<Dashboard>("/admin/dashboard"),
    apiFetch<PrimerosPasos>("/admin/onboarding"),
    apiFetch<ResumenPorAgente>("/admin/dashboard/agents"),
  ]);

  if (meRes.ok && !meRes.data.tenant) {
    // Cuenta sin negocio todavía: la invitación pendiente (si hay) se muestra arriba.
    const conInvitacion = meRes.data.invitaciones_pendientes > 0;
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Resumen" description={DESCRIPCION} />
        <Card>
          <EmptyState
            title={conInvitacion ? "Acepta tu invitación para entrar a tu negocio" : "Todavía no tienes un negocio"}
            description={
              conInvitacion
                ? "Cuando la aceptes, aquí vas a ver los primeros pasos para dejar tu asistente listo."
                : "Si te invitaron, revisa tu correo o pídele a quien te dio de alta una invitación nueva."
            }
          />
        </Card>
      </div>
    );
  }

  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar el panel: {res.error}
      </p>
    );
  }
  const d = res.data;

  const store = await cookies();
  const pasos = pasosRes.ok ? pasosRes.data : null;
  const ofrecerRecorrido =
    pasos !== null && debeOfrecerTour(store.get(TOUR_COOKIE)?.value, hayPasosParaActuar(pasos.pasos));

  const planHint =
    d.billing?.days_left !== null && d.billing?.days_left !== undefined
      ? `${d.billing.days_left} días restantes`
      : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Resumen"
        description={DESCRIPCION}
        actions={
          d.billing?.has_plan ? (
            <Badge variant={d.billing.operational ? "success" : "danger"}>
              {d.billing.plan_name}
            </Badge>
          ) : undefined
        }
        helpSection="dashboard"
      />
      {/* Primeros pasos y recorrido (HU-SH-06). Si no cargan, el Resumen sigue igual. */}
      {pasos && (
        <Bienvenida
          datos={pasos}
          ofrecerRecorrido={ofrecerRecorrido}
          pasosPlegados={store.get(PASOS_PLEGADOS_COOKIE)?.value === "1"}
        />
      )}
      <MissingTemplatesBanner />

      {/* KPIs por agente (ADR-0171). Si no cargan, el Resumen sigue con las cifras del negocio. */}
      {agentesRes.ok && tieneResumen(agentesRes.data) ? (
        <ResumenAgentes datos={agentesRes.data} />
      ) : (
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
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estado del sistema</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-body">Agente</span>
              <Badge variant={d.bot_paused ? "danger" : "success"}>
                {d.bot_paused ? "Pausado" : "Activo"}
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
                    <StatusBadge value={conv.status} map={CONVERSATION_STATUS} />
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
