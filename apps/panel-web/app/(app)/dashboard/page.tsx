import { cookies } from "next/headers";

import { Bienvenida } from "@/components/domain/bienvenida";
import { MissingTemplatesBanner } from "@/components/domain/missing-templates-banner";
import { Badge } from "@/components/ui/badge";
import { FilterChips } from "@/components/ui/filter-chips";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ConversacionesRecientes } from "@/components/dashboard/conversaciones-recientes";
import { EstadoDelSistema } from "@/components/dashboard/estado-del-sistema";
import { ResumenAgentes } from "@/components/dashboard/resumen-agentes";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { apiFetch } from "@/lib/api/server";
import type { Dashboard, Me, PrimerosPasos, ResumenPorAgente } from "@/lib/api/types";
import { formatNumber, formatUsd } from "@/lib/format";
import { PASOS_PLEGADOS_COOKIE, hayPasosParaActuar } from "@/lib/primeros-pasos";
import { DIAS_DEL_RESUMEN, diasValidos, etiquetaDeDias } from "@/lib/resumen/periodos";
import { TOUR_COOKIE, debeOfrecerTour } from "@/lib/tour";

export const metadata = { title: "Resumen" };

const DESCRIPCION = "Estado del negocio, actividad por agente y consumo.";

/** Un colaborador con solo «Resumen» recibe el bloque vacío: ahí se muestran las cifras de siempre. */
function tieneResumen(r: ResumenPorAgente): boolean {
  return r.general.kpis.length > 0 || r.agentes.some((a) => a.kpis.length > 0 || a.modulos.length > 0);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const dias = diasValidos((await searchParams).dias);
  // `/admin/me` ya lo pidió el layout: el fetch se memoiza en el mismo render.
  const [meRes, res, pasosRes, agentesRes] = await Promise.all([
    apiFetch<Me>("/admin/me"),
    apiFetch<Dashboard>("/admin/dashboard"),
    apiFetch<PrimerosPasos>("/admin/onboarding"),
    apiFetch<ResumenPorAgente>(`/admin/dashboard/agents?dias=${dias}`),
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

  const conResumen = agentesRes.ok && tieneResumen(agentesRes.data);
  // Primeros pasos y recorrido (HU-SH-06). Si no cargan, el Resumen sigue igual.
  const bienvenida = (
    <>
      {pasos && (
        <Bienvenida
          datos={pasos}
          ofrecerRecorrido={ofrecerRecorrido}
          pasosPlegados={store.get(PASOS_PLEGADOS_COOKIE)?.value === "1"}
        />
      )}
      <MissingTemplatesBanner />
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Resumen"
        description={DESCRIPCION}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {/* El período gobierna todo el Resumen (cifras, evolución y tarjetas): vive en el encabezado. */}
            {agentesRes.ok && tieneResumen(agentesRes.data) && (
              <FilterChips
                label="Período del resumen"
                items={DIAS_DEL_RESUMEN.map((n) => ({
                  label: etiquetaDeDias(n),
                  href: `/dashboard?dias=${n}`,
                  active: n === dias,
                }))}
              />
            )}
            {d.billing?.has_plan && (
              <Badge variant={d.billing.operational ? "success" : "danger"}>{d.billing.plan_name}</Badge>
            )}
          </div>
        }
        helpSection="dashboard"
      />
      {/* Con el Resumen por agente, «Agente general» va primero y los pasos iniciales debajo; sin él,
          los pasos siguen arriba, que es lo que necesita un negocio recién creado. */}
      {!conResumen && bienvenida}

      {/* KPIs por agente (ADR-0171). Si no cargan, el Resumen sigue con las cifras del negocio. */}
      {agentesRes.ok && conResumen ? (
        <ResumenAgentes datos={agentesRes.data} despuesDelGeneral={bienvenida} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Conversaciones (7 días)" value={formatNumber(d.kpi.conversations_7d)} href="/conversaciones" />
          <StatCard label="Mensajes (7 días)" value={formatNumber(d.kpi.messages_7d)} href="/conversaciones" />
          <StatCard
            label="Escalaciones pendientes"
            value={formatNumber(d.kpi.pending_escalations)}
            tone={d.kpi.pending_escalations > 0 ? "warning" : "default"}
            href="/escalaciones?estado=pendiente"
          />
          <StatCard
            label="Costo LLM (30 días)"
            value={formatUsd(d.kpi.cost_30d)}
            tone="accent"
            hint={planHint}
            href="/costos"
          />
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ConversacionesRecientes recientes={d.recent} />
        <EstadoDelSistema d={d} />
      </div>
    </div>
  );
}
