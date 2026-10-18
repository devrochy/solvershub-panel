import { SelectorDePlantilla } from "@/app/(app)/agentes/nuevo/_components/selector-de-plantilla";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { AgentTemplatePage } from "@/lib/api/types";

export const metadata = { title: "Nuevo agente" };

/** Crear un agente desde una plantilla (HU-AOS-24). */
export default async function NuevoAgentePage() {
  const res = await apiFetch<AgentTemplatePage>("/admin/agent-templates?page_size=100");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nuevo agente"
        description="Elige una plantilla: tu agente nace con sus superpoderes y frases sugeridas, y lo ajustas paso a paso antes de publicarlo."
        breadcrumbs={[{ label: "Agentes" }, { label: "Nuevo agente" }]}
      />
      {res.ok ? (
        <SelectorDePlantilla plantillas={res.data.items} />
      ) : (
        <p role="alert" className="text-status-danger-fg">
          No se pudieron cargar las plantillas: {res.error}
        </p>
      )}
    </div>
  );
}
