import Link from "next/link";
import { notFound } from "next/navigation";

import { AgentFilters } from "@/app/(app)/agentes/_components/agent-filters";
import { ConocimientoDelAgente } from "@/app/(app)/agentes/_components/conocimiento";
import { DatosDePruebaDelAgente } from "@/app/(app)/agentes/_components/datos-de-prueba";
import {
  ConsumoDelAgente,
  ConversacionesDelAgente,
  RegistrosDelAgente,
  TareasDelAgente,
} from "@/app/(app)/agentes/_components/agent-tabs";
import { DetailPage } from "@/components/templates/detail-page";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { TabLinks } from "@/components/ui/tab-links";
import { apiFetch, type ApiResult } from "@/lib/api/server";
import type {
  AgentConversationPage,
  AgentCustomerPage,
  AgentDetail,
  AgentRecordPage,
  AgentsOverview,
  AgentTaskPage,
  AgentUsage,
  EstadoDatosDePrueba,
  KnowledgeDocument,
  Me,
} from "@/lib/api/types";
import {
  filtrosDe,
  hrefDeAgente,
  PESTANAS,
  pestanaValida,
  puedeEditarAgentes,
  puedeEscribirConocimiento,
  queryDeApi,
  refValido,
  tieneConocimiento,
  tipoDeAgente,
  type Pestana,
} from "@/lib/agentes";
import { usaConocimiento } from "@/lib/conocimiento";

export const metadata = { title: "Agente" };

type Paginada = { total: number; page: number; has_more: boolean };

function ErrorDeCarga({ res }: { res: ApiResult<unknown> }) {
  return (
    <p role="alert" className="text-status-danger-fg">
      No se pudo cargar esta vista: {res.ok ? "respuesta inesperada" : res.error}
    </p>
  );
}

export default async function AgentePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ref = refValido((await params).id);
  if (!ref) notFound();
  const sp = await searchParams;
  const tab: Pestana = pestanaValida(sp.tab);
  const filtros = filtrosDe(sp);

  const [overviewRes, meRes] = await Promise.all([
    apiFetch<AgentsOverview>("/admin/agents/overview"),
    apiFetch<Me>("/admin/me"),
  ]);
  if (!overviewRes.ok) return <ErrorDeCarga res={overviewRes} />;
  const agente = overviewRes.data.items.find((a) => a.ref === ref);
  if (!agente) notFound();
  // Nunca un 403 por diseño: sin permiso de conversaciones, esa pestaña no se muestra.
  const permisos = (meRes.ok ? meRes.data.permissions : null) ?? {};
  const verConversaciones = meRes.ok && (meRes.data.role === "master" || Boolean(permisos.conversations));
  const pestanas = PESTANAS.filter(
    (p) =>
      (p.id !== "conversaciones" || verConversaciones) && (p.id !== "conocimiento" || tieneConocimiento(agente)),
  );
  const actual: Pestana = pestanas.some((p) => p.id === tab) ? tab : pestanas[0].id;
  const vigente = { tab: actual, ...filtros };
  const base = `/admin/agents/${ref}`;
  const qs = queryDeApi(filtros);

  let contenido: React.ReactNode;
  let paginada: Paginada | null = null;
  let etiqueta = "";
  if (actual === "conversaciones") {
    const res = await apiFetch<AgentConversationPage>(`${base}/conversations?${qs}`);
    if (!res.ok) return <ErrorDeCarga res={res} />;
    contenido = <ConversacionesDelAgente page={res.data} nombre={agente.name} />;
    paginada = res.data;
    etiqueta = "conversaciones";
  } else if (actual === "tareas") {
    const res = await apiFetch<AgentTaskPage>(`${base}/tasks?${qs}`);
    if (!res.ok) return <ErrorDeCarga res={res} />;
    contenido = (
      <div className="flex flex-col gap-4">
        <TabLinks
          label="Estado de las tareas"
          current={hrefDeAgente(ref, vigente, { estado: filtros.estado })}
          items={[
            { label: "Todas", href: hrefDeAgente(ref, vigente, { estado: null }) },
            { label: "En curso", href: hrefDeAgente(ref, vigente, { estado: "open" }) },
            { label: "Cerradas", href: hrefDeAgente(ref, vigente, { estado: "closed" }) },
          ]}
        />
        <TareasDelAgente page={res.data} nombre={agente.name} />
      </div>
    );
    paginada = res.data;
    etiqueta = "tareas";
  } else if (actual === "registros") {
    const [records, customers] = await Promise.all([
      apiFetch<AgentRecordPage>(`${base}/records?${qs}`),
      verConversaciones ? apiFetch<AgentCustomerPage>(`${base}/customers?${qs}`) : Promise.resolve(null),
    ]);
    if (!records.ok) return <ErrorDeCarga res={records} />;
    contenido = (
      <RegistrosDelAgente
        records={records.data}
        customers={customers && customers.ok ? customers.data : null}
        nombre={agente.name}
      />
    );
    paginada = records.data;
    etiqueta = "registros";
  } else if (actual === "conocimiento" && agente.id) {
    const [docs, detalle] = await Promise.all([
      apiFetch<KnowledgeDocument[]>(`/pack/pack_knowledge/agents/${agente.id}/documents`),
      apiFetch<AgentDetail>(`/admin/agents/${agente.id}`),
    ]);
    if (!docs.ok) return <ErrorDeCarga res={docs} />;
    const borrador = detalle.ok ? (detalle.data.draft?.content as Record<string, unknown> | undefined) : undefined;
    contenido = (
      <ConocimientoDelAgente
        agenteId={agente.id}
        nombre={agente.name}
        documentos={docs.data}
        puedeEscribir={meRes.ok && puedeEscribirConocimiento(meRes.data)}
        usaConocimiento={borrador ? usaConocimiento(borrador) : false}
        puedeEditar={meRes.ok && puedeEditarAgentes(meRes.data, overviewRes.data.runtime)}
      />
    );
  } else {
    const res = await apiFetch<AgentUsage>(`${base}/usage?${queryDeApi(filtros, new Date(), false)}`);
    if (!res.ok) return <ErrorDeCarga res={res} />;
    contenido = <ConsumoDelAgente usage={res.data} nombre={agente.name} />;
  }

  // Datos de prueba (HU-QA-10): solo en test (fuera, la API responde 404 y no se muestra nada) y
  // con escritura en la sección `agents`, la misma que exige la API.
  const datosDePrueba =
    agente.id && agente.kind === "specialist" && meRes.ok && puedeEscribirConocimiento(meRes.data)
      ? await apiFetch<EstadoDatosDePrueba>(`/admin/agents/${agente.id}/datos-de-prueba`)
      : null;
  const puedeEditar = agente.id && meRes.ok && puedeEditarAgentes(meRes.data, overviewRes.data.runtime);

  const conexiones = agente.connections.map((c) => ({ id: c.id, label: c.label }));
  const descripcion = [
    tipoDeAgente(agente.kind),
    conexiones.length ? `Atiende en ${conexiones.map((c) => c.label).join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <DetailPage
      header={{
        title: agente.name,
        description: descripcion,
        breadcrumbs: [{ label: "Agentes", href: "/agentes" }, { label: agente.name }],
        actions:
          puedeEditar || datosDePrueba?.ok ? (
            <>
              {agente.id && datosDePrueba?.ok && (
                <DatosDePruebaDelAgente agenteId={agente.id} nombre={agente.name} estado={datosDePrueba.data} />
              )}
              {puedeEditar && (
                <Button asChild variant="outline">
                  <Link href={`/agentes/${agente.id}/editar`}>Editar agente</Link>
                </Button>
              )}
            </>
          ) : undefined,
        tabs: (
          <TabLinks
            label={`Secciones de ${agente.name}`}
            current={hrefDeAgente(ref, vigente, { tab: actual })}
            items={pestanas.map((p) => ({ label: p.label, href: hrefDeAgente(ref, vigente, { tab: p.id }) }))}
          />
        ),
      }}
    >
      {actual !== "conocimiento" && (
        <AgentFilters
          baseHref={`/agentes/${ref}`}
          tab={actual}
          dias={filtros.dias}
          conexion={filtros.conexion}
          connections={conexiones}
        />
      )}
      {contenido}
      {paginada && paginada.total > 0 && (
        <Pagination
          page={paginada.page}
          hasMore={paginada.has_more}
          total={paginada.total}
          label={etiqueta}
          makeHref={(target) => hrefDeAgente(ref, vigente, { page: target })}
        />
      )}
    </DetailPage>
  );
}
