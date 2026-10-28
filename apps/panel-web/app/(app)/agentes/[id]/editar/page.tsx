import { notFound } from "next/navigation";

import { EditorDeAgente } from "@/app/(app)/agentes/[id]/editar/_components/editor-de-agente";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type {
  AgentDetail,
  LlmModelCatalog,
  Me,
  PublishTargetPage,
  RequirementPage,
  SuperpowerPage,
} from "@/lib/api/types";

export const metadata = { title: "Editar agente" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Editor por pasos de un agente especialista (HU-AOS-24). */
export default async function EditarAgentePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paso?: string }>;
}) {
  const { id } = await params;
  const { paso } = await searchParams;
  // El asistente de creación (HU-AOS-54) deja al dueño directo en «Publicar».
  const pasoInicial = paso === "publicar" ? "publicar" : undefined;
  if (!UUID.test(id)) notFound();
  const [agente, superpoderes, modelos, destinos, me, requisitos] = await Promise.all([
    apiFetch<AgentDetail>(`/admin/agents/${id}`),
    apiFetch<SuperpowerPage>(`/admin/agent-superpowers?agent_id=${id}&page_size=100`),
    apiFetch<LlmModelCatalog>("/admin/agent-models?page_size=100"),
    apiFetch<PublishTargetPage>(`/admin/agents/${id}/publish-targets?page_size=100`),
    apiFetch<Me>("/admin/me"),
    apiFetch<RequirementPage>(`/admin/agents/${id}/requirements?page_size=100`),
  ]);
  if (!agente.ok && agente.status === 404) notFound();

  const falla = [agente, superpoderes, modelos].find((r) => !r.ok);
  if (!agente.ok || !superpoderes.ok || !modelos.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo abrir el editor: {falla && !falla.ok ? falla.error : "inténtalo de nuevo."}
      </p>
    );
  }
  const titulo = `Editar ${agente.data.name}`;
  if (agente.data.kind !== "specialist") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={titulo} breadcrumbs={[{ label: "Agentes" }, { label: agente.data.name }]} />
        <p className="text-sm text-body">
          Este agente lo administra el sistema (Coordinador o back-office): el editor por pasos es para especialistas.
        </p>
      </div>
    );
  }
  const puedeActivar = me.ok && (me.data.role === "master" || me.data.tenant?.role === "owner");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={titulo}
        description="Ajusta tu agente paso a paso. Lo avanzado está plegado: no hace falta tocarlo."
        breadcrumbs={[{ label: "Agentes" }, { label: agente.data.name }]}
      />
      <EditorDeAgente
        agente={agente.data}
        superpoderes={superpoderes.data.items}
        modelos={modelos.data}
        destinos={destinos.ok ? destinos.data.items : []}
        destinosError={destinos.ok ? null : destinos.error}
        puedeActivar={puedeActivar}
        requisitos={requisitos.ok ? requisitos.data.items : []}
        pasoInicial={pasoInicial}
      />
    </div>
  );
}
