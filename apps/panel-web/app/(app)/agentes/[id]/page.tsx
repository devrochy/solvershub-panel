import Link from "next/link";
import { notFound } from "next/navigation";

import { AgentFilters } from "@/app/(app)/agentes/_components/agent-filters";
import { ConocimientoDelAgente } from "@/app/(app)/agentes/_components/conocimiento";
import { DatosDePruebaDelAgente } from "@/app/(app)/agentes/_components/datos-de-prueba";
import { ImportarDatosDelAgente } from "@/app/(app)/agentes/_components/importar-datos";
import {
  ConsumoDelAgente,
  ConversacionesDelAgente,
  RegistrosDelAgente,
  TareasDelAgente,
} from "@/app/(app)/agentes/_components/agent-tabs";
import { ConexionesDelAgente } from "@/components/domain/agentes/conexiones-del-agente";
import { IndicadoresDelAgente, type Indicador } from "@/components/domain/agentes/indicadores-del-agente";
import { ProbarAgente } from "@/components/domain/agentes/probar-agente";
import { SelectorDeAgentes } from "@/components/domain/agentes/selector-de-agentes";
import { SuperpoderesDelAgente } from "@/components/domain/agentes/superpoderes-del-agente";
import { DetailPage } from "@/components/templates/detail-page";
import { Badge } from "@/components/ui/badge";
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
  ConnectionsConsole,
  EstadoDatosDePrueba,
  EstadoImportacion,
  KnowledgeDocument,
  LlmModelCatalog,
  Me,
  PluginSummary,
  ReliabilityResponse,
  RequirementPage,
  SuperpowerPage,
} from "@/lib/api/types";
import {
  filtrosDe,
  hrefDeAgente,
  PESTANAS,
  PESTANAS_SIN_FILTROS,
  pestanaValida,
  puedeEditarAgentes,
  puedeEscribirConocimiento,
  queryDeApi,
  refValido,
  tieneConexiones,
  tieneConocimiento,
  tieneSuperpoderes,
  tipoDeAgente,
  type Pestana,
} from "@/lib/agentes";
import { MIN_FRASES_POR_DEFECTO } from "@/lib/agentes-editor";
import {
  conexionesDelAgente,
  conexionParaProbar,
  desdeHace,
  estadoDePublicacion,
  hayCambiosSinPublicar,
  instanciasDelAgente,
  nombresDeHabilidades,
  resueltasSinPersona,
} from "@/lib/agentes-ficha";
import { usaConocimiento } from "@/lib/conocimiento";

export const metadata = { title: "Agente" };

type Paginada = { total: number; page: number; has_more: boolean };

/** Tope de páginas de la consola (100 conexiones cada una): un negocio real tiene unas pocas. */
const MAX_PAGINAS_CONSOLA = 5;

/** Todas las conexiones de la consola, en una llamada por página (no una por conexión). */
async function cargarConsola(): Promise<{ items: ConnectionsConsole["items"] } | { error: string }> {
  const items: ConnectionsConsole["items"] = [];
  for (let pagina = 1; pagina <= MAX_PAGINAS_CONSOLA; pagina++) {
    const res = await apiFetch<ConnectionsConsole>(`/admin/connections/console?page=${pagina}&page_size=100`);
    if (!res.ok) return { error: res.error };
    items.push(...res.data.items);
    if (!res.data.has_more) break;
  }
  return { items };
}

function indicador<T, R>(res: ApiResult<T> | null, valor: (data: T) => R): Indicador<R> {
  if (!res) return null;
  return res.ok ? { valor: valor(res.data) } : { error: "Sin datos por ahora." };
}

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
      (p.id !== "conversaciones" || verConversaciones) &&
      (p.id !== "conocimiento" || tieneConocimiento(agente)) &&
      (p.id !== "superpoderes" || tieneSuperpoderes(agente)) &&
      ((p.id !== "conexiones" && p.id !== "probar") || tieneConexiones(agente)),
  );
  const actual: Pestana = pestanas.some((p) => p.id === tab) ? tab : pestanas[0].id;
  const vigente = { tab: actual, ...filtros };
  const base = `/admin/agents/${ref}`;
  const qs = queryDeApi(filtros);
  const puedeEditar = Boolean(agente.id) && meRes.ok && puedeEditarAgentes(meRes.data, overviewRes.data.runtime);
  const asignarHref =
    puedeEditar && agente.kind === "specialist" ? `/agentes/${agente.id}/editar?paso=publicar` : null;

  // Cabecera (HU-UX-09): detalle (propósito y versión), conexiones con rol y prioridad e indicadores de 7 días.
  // Cada indicador se degrada solo: si su consulta falla, la ficha abre igual.
  const desde7 = new URLSearchParams({ desde: desdeHace(7) }).toString();
  const [detalleRes, consola, fiabilidad, uso7, conversaciones7] = await Promise.all([
    agente.id ? apiFetch<AgentDetail>(`/admin/agents/${agente.id}`) : Promise.resolve(null),
    agente.id ? cargarConsola() : Promise.resolve(null),
    agente.id ? apiFetch<ReliabilityResponse>(`/admin/reliability?${desde7}`) : Promise.resolve(null),
    apiFetch<AgentUsage>(`${base}/usage?${desde7}`),
    verConversaciones ? apiFetch<AgentConversationPage>(`${base}/conversations?${desde7}&page_size=1`) : Promise.resolve(null),
  ]);
  const detalle = detalleRes?.ok ? detalleRes.data : null;
  const consolaItems = consola && "items" in consola ? consola.items : null;
  const filasDeConexiones = agente.id && consolaItems ? conexionesDelAgente(consolaItems, agente.id) : [];
  const resueltas: Indicador<{ porcentaje: number | null; turnos: number }> = !agente.id
    ? null
    : !fiabilidad?.ok || !consolaItems
      ? { error: "Sin datos por ahora." }
      : {
          valor: resueltasSinPersona(
            fiabilidad.data.operational.by_agent,
            instanciasDelAgente(consolaItems, agente.id),
            fiabilidad.data.minimum_sample?.turns ?? 0,
          ),
        };

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
  } else if (actual === "conexiones") {
    contenido = (
      <ConexionesDelAgente
        filas={filasDeConexiones}
        nombre={agente.name}
        publicado={agente.published}
        asignarHref={asignarHref}
        error={consola && "error" in consola ? consola.error : null}
        respaldo={agente.connections.map((c) => ({ id: c.id, label: c.label }))}
      />
    );
  } else if (actual === "superpoderes" && agente.id) {
    const [superpoderes, modelos, plugins, requisitos] = await Promise.all([
      apiFetch<SuperpowerPage>(`/admin/agent-superpowers?agent_id=${agente.id}&page_size=100`),
      apiFetch<LlmModelCatalog>("/admin/agent-models?page_size=100"),
      apiFetch<PluginSummary[]>("/admin/plugins"),
      apiFetch<RequirementPage>(`/admin/agents/${agente.id}/requirements?page_size=100`),
    ]);
    if (!superpoderes.ok) return <ErrorDeCarga res={superpoderes} />;
    if (!detalle) return <ErrorDeCarga res={detalleRes ?? superpoderes} />;
    const nombre = nombresDeHabilidades(plugins.ok ? plugins.data : []);
    contenido = (
      <SuperpoderesDelAgente
        agente={detalle}
        catalogo={superpoderes.data.items}
        minFrases={modelos.ok ? modelos.data.min_phrases : MIN_FRASES_POR_DEFECTO}
        nombreDeHabilidad={Object.fromEntries(superpoderes.data.items.map((p) => [p.skill, nombre(p.skill)]))}
        requisitos={requisitos.ok ? requisitos.data.items : []}
        puedeEditar={puedeEditar}
        cambiosSinPublicar={hayCambiosSinPublicar(detalle)}
      />
    );
  } else if (actual === "probar") {
    const conexion = conexionParaProbar(filasDeConexiones, filtros.conexion);
    contenido = (
      <ProbarAgente
        nombre={agente.name}
        conexion={conexion}
        opciones={filasDeConexiones.map((f) => ({
          id: f.id,
          label: f.label,
          href: hrefDeAgente(ref, vigente, { tab: "probar", conexion: f.id }),
        }))}
        asignarHref={asignarHref}
      />
    );
  } else if (actual === "conocimiento" && agente.id) {
    const docs = await apiFetch<KnowledgeDocument[]>(`/pack/pack_knowledge/agents/${agente.id}/documents`);
    if (!docs.ok) return <ErrorDeCarga res={docs} />;
    const borrador = detalle?.draft?.content as Record<string, unknown> | undefined;
    contenido = (
      <ConocimientoDelAgente
        agenteId={agente.id}
        nombre={agente.name}
        documentos={docs.data}
        puedeEscribir={meRes.ok && puedeEscribirConocimiento(meRes.data)}
        usaConocimiento={borrador ? usaConocimiento(borrador) : false}
        puedeEditar={puedeEditar}
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
  // Importar datos existentes (HU-QA-12): mismo criterio; la API exige además escritura en la sección del pack.
  const importacion = datosDePrueba?.ok
    ? await apiFetch<EstadoImportacion>(`/admin/agents/${agente.id}/importar-datos`)
    : null;
  const conexiones = agente.connections.map((c) => ({ id: c.id, label: c.label }));
  const proposito = detalle?.description.trim();
  const descripcion = [tipoDeAgente(agente.kind), proposito || null].filter(Boolean).join(" · ");
  const publicacion = estadoDePublicacion(agente.published, detalle?.latest_version);

  return (
    <div className="flex flex-col gap-4">
      <SelectorDeAgentes
        agentes={overviewRes.data.items.map((a) => ({ ref: a.ref, key: a.key, name: a.name, published: a.published }))}
        actual={ref}
      />
      <DetailPage
        header={{
          title: agente.name,
          description: descripcion,
          breadcrumbs: [{ label: "Agentes", href: "/agentes" }, { label: agente.name }],
          actions: (
            <>
              {!agente.virtual &&
                (publicacion.tono === "success" ? (
                  <Badge variant="success">{publicacion.label}</Badge>
                ) : (
                  <Badge variant="neutral">{publicacion.label}</Badge>
                ))}
              {agente.id && importacion?.ok && (
                <ImportarDatosDelAgente agenteId={agente.id} nombre={agente.name} estado={importacion.data} />
              )}
              {agente.id && datosDePrueba?.ok && (
                <DatosDePruebaDelAgente agenteId={agente.id} nombre={agente.name} estado={datosDePrueba.data} />
              )}
              {puedeEditar && agente.kind === "specialist" && (
                <Button asChild variant="outline">
                  <Link href={`/agentes/${agente.id}/editar`}>Editar</Link>
                </Button>
              )}
            </>
          ),
          tabs: (
            <div className="flex flex-col gap-4">
              <IndicadoresDelAgente
                conversaciones={indicador(conversaciones7, (d) => d.total)}
                resueltas={resueltas}
                // Sin la sección `costs` la API manda el costo en null: el consumo va en respuestas.
                consumo={indicador(uso7, (d) => ({ costoUsd: d.total.cost_usd, turnos: d.total.turns }))}
              />
              <TabLinks
                label={`Secciones de ${agente.name}`}
                current={hrefDeAgente(ref, vigente, { tab: actual })}
                items={pestanas.map((p) => ({ label: p.label, href: hrefDeAgente(ref, vigente, { tab: p.id }) }))}
              />
            </div>
          ),
        }}
      >
        {!PESTANAS_SIN_FILTROS.has(actual) && (
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
    </div>
  );
}
