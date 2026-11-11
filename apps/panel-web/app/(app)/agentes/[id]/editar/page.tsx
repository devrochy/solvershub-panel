import Link from "next/link";
import { notFound } from "next/navigation";

import { EditorDeAgente } from "@/app/(app)/agentes/[id]/editar/_components/editor-de-agente";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { nombresDeHabilidades } from "@/lib/agentes-ficha";
import { apiFetch } from "@/lib/api/server";
import type {
  AgentDetail,
  AgentRetiredNotices,
  LlmModelCatalog,
  Me,
  PluginSummary,
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
  const [agente, superpoderes, modelos, destinos, me, requisitos, retiradas, plugins] = await Promise.all([
    apiFetch<AgentDetail>(`/admin/agents/${id}`),
    apiFetch<SuperpowerPage>(`/admin/agent-superpowers?agent_id=${id}&page_size=100`),
    apiFetch<LlmModelCatalog>("/admin/agent-models?page_size=100"),
    apiFetch<PublishTargetPage>(`/admin/agents/${id}/publish-targets?page_size=100`),
    apiFetch<Me>("/admin/me"),
    apiFetch<RequirementPage>(`/admin/agents/${id}/requirements?page_size=100`),
    // Aviso de referencias retiradas (HU-AOS-59): si no responde, el editor abre sin el aviso.
    apiFetch<AgentRetiredNotices>(`/admin/agents/${id}/retired-references`),
    // Nombre de la habilidad de cada superpoder (HU-UX-09); sin respuesta queda la etiqueta conocida.
    apiFetch<PluginSummary[]>("/admin/plugins"),
  ]);
  if (!agente.ok && agente.status === 404) notFound();

  const falla = [agente, superpoderes, modelos].find((r) => !r.ok);
  if (!agente.ok || !superpoderes.ok || !modelos.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Editar agente" breadcrumbs={[{ label: "Agentes", href: "/agentes" }, { label: "Editar" }]} tabs={false} />
        <ErrorDeCarga titulo="No pudimos abrir el editor" detalle={falla && !falla.ok ? falla.error : undefined} />
      </div>
    );
  }
  const titulo = `Editar ${agente.data.name}`;
  const migas = [
    { label: "Agentes", href: "/agentes" },
    { label: agente.data.name, href: `/agentes/${id}` },
    { label: "Editar" },
  ];
  const volver = (
    <Button asChild variant="outline">
      <Link href={`/agentes/${id}`}>Volver a {agente.data.name}</Link>
    </Button>
  );
  if (agente.data.kind !== "specialist") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={titulo} breadcrumbs={migas} tabs={false} actions={volver} />
        <p className="text-sm text-body">
          Este agente lo administra el sistema (Coordinador o back-office): el editor por pasos es para especialistas.
        </p>
      </div>
    );
  }
  const nombre = nombresDeHabilidades(plugins.ok ? plugins.data : []);
  const puedeActivar = me.ok && (me.data.role === "master" || me.data.tenant?.role === "owner");

  return (
    <div className="flex flex-col gap-6">
      {/* AGT-11: una tarea enfocada, sin las pestañas de la sección y con una salida a la ficha. */}
      <PageHeader
        title={titulo}
        description="Ajusta tu agente paso a paso. Lo avanzado está plegado: no hace falta tocarlo."
        breadcrumbs={migas}
        tabs={false}
        actions={volver}
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
        avisosRetirados={retiradas.ok ? retiradas.data : null}
        nombresDeHabilidades={Object.fromEntries(superpoderes.data.items.map((p) => [p.skill, nombre(p.skill)]))}
      />
    </div>
  );
}
