import Link from "next/link";

import { AsistenteDeAgente } from "@/app/(app)/agentes/nuevo/_components/asistente-de-agente";
import { PageHeader } from "@/components/ui/page-header";
import { puedeEditarAgentes } from "@/lib/agentes";
import { apiFetch } from "@/lib/api/server";
import type { AgentTemplatePage, Me } from "@/lib/api/types";

export const metadata = { title: "Nuevo agente" };

/** Crear un agente con el asistente de hasta 10 pasos (HU-AOS-54, SPEC-39). */
export default async function NuevoAgentePage() {
  const [plantillas, me, agentes] = await Promise.all([
    apiFetch<AgentTemplatePage>("/admin/agent-templates?page_size=100"),
    apiFetch<Me>("/admin/me"),
    apiFetch<{ runtime: string }>("/admin/agents?page_size=1"),
  ]);
  const runtime = agentes.ok ? agentes.data.runtime : "legacy";
  const puede = me.ok && puedeEditarAgentes(me.data, runtime);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nuevo agente"
        description="Responde unas preguntas según lo que quieres que haga: el asistente deja tu agente configurado y tú lo publicas."
        breadcrumbs={[{ label: "Agentes" }, { label: "Nuevo agente" }]}
      />
      {!puede ? (
        <p role="status" className="rounded-lg border border-status-info-border bg-status-info-bg px-4 py-3 text-sm text-body">
          {runtime !== "v3" && !(me.ok && me.data.role === "master")
            ? "Tu negocio todavía atiende con un solo agente, el General. Cuando el Agent OS se active, aquí podrás crear especialistas."
            : "Para crear agentes necesitas permiso de escritura en Ajustes. Pídeselo al dueño del negocio."}{" "}
          <Link className="text-link underline" href="/agentes">
            Volver a Agentes
          </Link>
        </p>
      ) : plantillas.ok ? (
        plantillas.data.items.length > 0 ? (
          <AsistenteDeAgente plantillas={plantillas.data.items} />
        ) : (
          <p className="text-sm text-body">Todavía no hay tipos de agente disponibles.</p>
        )
      ) : (
        <p role="alert" className="text-status-danger-fg">
          No se pudo cargar el asistente: {plantillas.error}
        </p>
      )}
    </div>
  );
}
