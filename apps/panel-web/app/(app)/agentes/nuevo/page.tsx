import Link from "next/link";

import { NuevoAgente } from "@/app/(app)/agentes/nuevo/_components/nuevo-agente";
import { AvisoLimiteDePlan } from "@/components/domain/aviso-limite-de-plan";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { puedeEditarAgentes } from "@/lib/agentes";
import { negocioDesdeIdentidad } from "@/lib/agentes-editor";
import { avisoDeTopeDeAgentes } from "@/lib/plan-limite";
import { apiFetch } from "@/lib/api/server";
import type { AgentsOverview, AgentTemplatePage, Me, SettingsResponse } from "@/lib/api/types";

export const metadata = { title: "Nuevo agente" };

/** Nuevo agente en 5 estaciones (HU-AOS-86, SPEC-49): aquí va la 1 (Tipo); las otras cuatro, en el editor en modo crear. */
export default async function NuevoAgentePage() {
  const [plantillas, me, agentes, ajustes] = await Promise.all([
    apiFetch<AgentTemplatePage>("/admin/agent-templates?page_size=100"),
    apiFetch<Me>("/admin/me"),
    apiFetch<AgentsOverview>("/admin/agents/overview"),
    // La voz del negocio para la vista previa; sin ella, el paso se ve sin teléfono.
    apiFetch<SettingsResponse>("/admin/settings"),
  ]);
  const negocio = negocioDesdeIdentidad(me.ok ? (me.data.tenant?.name ?? "") : "", ajustes.ok ? ajustes.data.identity : null);
  const puede = me.ok && puedeEditarAgentes(me.data);
  const avisoTope = agentes.ok ? avisoDeTopeDeAgentes(agentes.data.cuota_agentes) : null;
  const migas = [{ label: "Agentes", href: "/agentes" }, { label: "Nuevo agente" }];
  // HU-AOS-86: en la ruta de lanzamiento el titular es la pregunta de la estación (su `h1`) y arriba
  // solo van las migas. Los avisos (sin permiso, tope del plan, error) conservan su `PageHeader`.
  if (puede && !avisoTope && plantillas.ok && plantillas.data.items.length > 0) {
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumbs items={migas} />
        <NuevoAgente plantillas={plantillas.data.items} negocio={negocio} agentes={agentes.ok ? agentes.data.items : []} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Nuevo agente" breadcrumbs={migas} />
      {!puede ? (
        <p role="status" className="rounded-lg border border-status-info-border bg-status-info-bg px-4 py-3 text-sm text-body">
          Para crear agentes necesitas permiso de escritura en Ajustes. Pídeselo al dueño del negocio.{" "}
          <Link className="text-link underline" href="/agentes">
            Volver a Agentes
          </Link>
        </p>
      ) : avisoTope ? (
        <div className="flex flex-col gap-3">
          <AvisoLimiteDePlan mensaje={avisoTope} />
          <Link className="text-sm text-link underline" href="/agentes">
            Volver a Agentes
          </Link>
        </div>
      ) : plantillas.ok ? (
        <p className="text-sm text-body">Todavía no hay tipos de agente disponibles.</p>
      ) : (
        <ErrorDeCarga titulo="No pudimos cargar el asistente" detalle={plantillas.error} />
      )}
    </div>
  );
}
