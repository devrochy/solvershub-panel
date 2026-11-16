import Link from "next/link";

import { NuevoAgente } from "@/app/(app)/agentes/nuevo/_components/nuevo-agente";
import { AvisoLimiteDePlan } from "@/components/domain/aviso-limite-de-plan";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { PageHeader } from "@/components/ui/page-header";
import { puedeEditarAgentes } from "@/lib/agentes";
import { negocioDesdeIdentidad } from "@/lib/agentes-editor";
import { avisoDeTopeDeAgentes } from "@/lib/plan-limite";
import { apiFetch } from "@/lib/api/server";
import type { AgentsOverview, AgentTemplatePage, Me, SettingsResponse } from "@/lib/api/types";

export const metadata = { title: "Nuevo agente" };

/** Crear un agente con el recorrido común (HU-AOS-77, SPEC-47): aquí va «Identidad»; el resto, en el editor en modo crear. */
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
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nuevo agente"
        description="Los mismos pasos que al editar: eliges qué hace, ajustas cómo habla y lo que sabe, y lo publicas al final."
        breadcrumbs={[{ label: "Agentes" }, { label: "Nuevo agente" }]}
      />
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
        plantillas.data.items.length > 0 ? (
          <NuevoAgente plantillas={plantillas.data.items} negocio={negocio} />
        ) : (
          <p className="text-sm text-body">Todavía no hay tipos de agente disponibles.</p>
        )
      ) : (
        <ErrorDeCarga titulo="No pudimos cargar el asistente" detalle={plantillas.error} />
      )}
    </div>
  );
}
