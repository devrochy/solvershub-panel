import { cookies } from "next/headers";

import { Bienvenida } from "@/components/domain/bienvenida";
import { MissingTemplatesBanner } from "@/components/domain/missing-templates-banner";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BotonReintentar, EstadoDeError } from "@/components/ui/estado-de-error";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ConversacionesRecientes } from "@/components/dashboard/conversaciones-recientes";
import { EstadoDelSistema } from "@/components/dashboard/estado-del-sistema";
import { ResumenAgentes } from "@/components/dashboard/resumen-agentes";
import { TeEsperan } from "@/components/dashboard/te-esperan";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { apiFetch } from "@/lib/api/server";
import type { Dashboard, EscalationPage, Me, PrimerosPasos, ResumenPorAgente } from "@/lib/api/types";
import { formatNumber, formatUsd } from "@/lib/format";
import { PASOS_PLEGADOS_COOKIE } from "@/lib/primeros-pasos";
import { DIAS_DEL_RESUMEN, diasValidos, etiquetaDeDias } from "@/lib/resumen/periodos";

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
  const [meRes, res, pasosRes, agentesRes, esperanRes] = await Promise.all([
    apiFetch<Me>("/admin/me"),
    apiFetch<Dashboard>("/admin/dashboard"),
    apiFetch<PrimerosPasos>("/admin/onboarding"),
    apiFetch<ResumenPorAgente>(`/admin/dashboard/agents?dias=${dias}`),
    // Quien no ve Escalaciones recibe un error aquí: entonces no hay columna.
    apiFetch<EscalationPage>("/admin/escalations?estado=pendiente"),
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
      <div className="flex flex-col gap-6">
        <PageHeader title="Resumen" description={DESCRIPCION} helpSection="dashboard" densidad="compacta" />
        <div className="rounded-lg border border-border-soft bg-surface">
          <EstadoDeError
            titulo="No pudimos cargar el Resumen"
            descripcion="Revisa tu conexión y vuelve a intentarlo. Si sigue pasando, avísanos."
            detalle={res.error}
            accion={<BotonReintentar />}
          />
        </div>
      </div>
    );
  }
  const d = res.data;

  const store = await cookies();
  const pasos = pasosRes.ok ? pasosRes.data : null;
  const esPlataforma = meRes.ok && meRes.data.role === "master";

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
        densidad="compacta"
        actions={
          /* El período gobierna todo el Resumen (cifras, evolución y tarjetas): vive en el encabezado. */
          conResumen ? (
            <SegmentedControl
              label="Período del resumen"
              className="w-64"
              value={String(dias)}
              options={DIAS_DEL_RESUMEN.map((n) => ({
                value: String(n),
                label: etiquetaDeDias(n),
                href: `/dashboard?dias=${n}`,
              }))}
            />
          ) : undefined
        }
        helpSection="dashboard"
      />
      {/* Con el Resumen por agente, «Agente general» va primero y los pasos iniciales debajo; sin él,
          los pasos siguen arriba, que es lo que necesita un negocio recién creado. */}
      {!conResumen && bienvenida}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:grid-rows-[auto_1fr]">
        {esperanRes.ok && (
          <TeEsperan
            escalaciones={esperanRes.data.items}
            total={esperanRes.data.total}
            className="xl:col-start-2 xl:row-start-1"
          />
        )}
        <div className="flex min-w-0 flex-col gap-6 xl:col-start-1 xl:row-span-2 xl:row-start-1">
          {/* KPIs por agente (ADR-0171). Si no cargan, el Resumen sigue con las cifras del negocio. */}
          {agentesRes.ok && conResumen ? (
            <ResumenAgentes datos={agentesRes.data} despuesDelGeneral={bienvenida} ocultarEscalaciones={esperanRes.ok} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard label="Conversaciones (7 días)" value={formatNumber(d.kpi.conversations_7d)} href="/conversaciones" />
              <StatCard label="Mensajes (7 días)" value={formatNumber(d.kpi.messages_7d)} href="/conversaciones" />
              <StatCard
                label="Escalaciones pendientes"
                value={formatNumber(d.kpi.pending_escalations)}
                tone={d.kpi.pending_escalations > 0 ? "warning" : "default"}
                href="/escalaciones?estado=pendiente"
              />
              {/* Rediseño B de Consumo y plan: los costos en dólares son del equipo de SolversHub. */}
              {esPlataforma ? (
                <StatCard
                  label="Costo LLM (30 días)"
                  value={formatUsd(d.kpi.cost_30d)}
                  tone="accent"
                  hint={planHint}
                  href="/costos"
                />
              ) : (
                <StatCard label="Plan" value={d.billing?.plan_name ?? "Sin plan"} hint={planHint} href="/plan" />
              )}
            </div>
          )}

        </div>
        <div className="flex min-w-0 flex-col gap-4 xl:col-start-2">
          <ConversacionesRecientes recientes={d.recent} />
          <EstadoDelSistema d={d} esPlataforma={esPlataforma} />
        </div>
      </div>
    </div>
  );
}
