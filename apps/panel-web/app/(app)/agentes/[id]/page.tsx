import Link from "next/link";
import { notFound } from "next/navigation";

import { AgentFilters } from "@/app/(app)/agentes/_components/agent-filters";
import { ConocimientoDelAgente } from "@/app/(app)/agentes/_components/conocimiento";
import { DatosDePruebaDelAgente } from "@/app/(app)/agentes/_components/datos-de-prueba";
import { ImportarDatosDelAgente } from "@/app/(app)/agentes/_components/importar-datos";
import {
  ClientesDelAgente,
  ConsumoDelAgente,
  ConversacionesDelAgente,
  RegistrosDelAgente,
  TareasDelAgente,
} from "@/app/(app)/agentes/_components/agent-tabs";
import { ArchivarAgente } from "@/components/domain/agentes/archivar-agente";
import { ConexionesDelAgente } from "@/components/domain/agentes/conexiones-del-agente";
import { IndicadoresDelAgente, type Indicador } from "@/components/domain/agentes/indicadores-del-agente";
import { ProbarAgente } from "@/components/domain/agentes/probar-agente";
import { SelectorDeAgentes } from "@/components/domain/agentes/selector-de-agentes";
import { SuperpoderesDelAgente } from "@/components/domain/agentes/superpoderes-del-agente";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { DetailPage } from "@/components/templates/detail-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SegmentedControl } from "@/components/ui/segmented-control";
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
  PlanResponse,
  PluginSummary,
  ReliabilityResponse,
  RequirementPage,
  SuperpowerPage,
} from "@/lib/api/types";
import {
  dondeAtiende,
  estaArchivado,
  filtrosDe,
  hrefDeAgente,
  papelDelAgente,
  PESTANAS,
  PESTANAS_SIN_FILTROS,
  puedeArchivar,
  puedeEditarAgentes,
  puedeEscribirConocimiento,
  queryDeApi,
  refValido,
  tieneConexiones,
  tieneConocimiento,
  tieneSuperpoderes,
  ubicacionDe,
  VISTAS_DE_ACTIVIDAD,
  type Pestana,
  type VistaDeActividad,
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
import { creditosPorAgenteId } from "@/lib/consumo";
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

/** Una parte de la ficha que no cargó: la cabecera y las pestañas siguen en pie (AGT-15). */
function NoCargo({ que, res }: { que: string; res: ApiResult<unknown> }) {
  return <ErrorDeCarga titulo={`No pudimos cargar ${que}`} detalle={res.ok ? undefined : res.error} />;
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-sh-block text-headline">{titulo}</h2>
      {children}
    </section>
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
  const ubicacion = ubicacionDe(sp);
  const filtros = filtrosDe(sp);

  const [overviewRes, meRes, planRes] = await Promise.all([
    apiFetch<AgentsOverview>("/admin/agents/overview"),
    apiFetch<Me>("/admin/me"),
    // Créditos del mes de este agente (AGT-03): si no responde, la frase va sin ellos.
    apiFetch<PlanResponse>("/admin/plan"),
  ]);
  if (!overviewRes.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Agente" breadcrumbs={[{ label: "Agentes", href: "/agentes" }]} tabs={false} />
        <NoCargo que="el agente" res={overviewRes} />
      </div>
    );
  }
  const agente = overviewRes.data.items.find((a) => a.ref === ref);
  if (!agente) notFound();
  // Nunca un 403 por diseño: sin permiso de conversaciones, esas vistas no se muestran.
  const permisos = (meRes.ok ? meRes.data.permissions : null) ?? {};
  const esMaster = meRes.ok && meRes.data.role === "master";
  const verConversaciones = meRes.ok && (esMaster || Boolean(permisos.conversations));
  const conSabe = tieneSuperpoderes(agente) || tieneConocimiento(agente);
  const pestanas = PESTANAS.filter((p) => (p.id !== "sabe" || conSabe) && (p.id !== "atiende" || tieneConexiones(agente)));
  const actual: Pestana = pestanas.some((p) => p.id === ubicacion.tab) ? ubicacion.tab : "actividad";
  const vistas = VISTAS_DE_ACTIVIDAD.filter((v) => verConversaciones || (v.id !== "conversaciones" && v.id !== "clientes"));
  const ver: VistaDeActividad = vistas.some((v) => v.id === ubicacion.ver) ? ubicacion.ver : vistas[0].id;
  const vigente = { tab: actual, ver, ...filtros };
  const base = `/admin/agents/${ref}`;
  const qs = queryDeApi(filtros);
  const puedeEditar = Boolean(agente.id) && meRes.ok && puedeEditarAgentes(meRes.data, overviewRes.data.runtime);
  const asignarHref =
    puedeEditar && agente.kind === "specialist" ? `/agentes/${agente.id}/editar?paso=publicar` : null;
  const delMes = creditosPorAgenteId(planRes.ok ? planRes.data.credit : null);
  const creditosDelMes = delMes.size > 0 && agente.id ? (delMes.get(agente.id) ?? 0) : null;

  // Cabecera (HU-UX-09): propósito, dónde atiende y lo que hizo en 7 días. Cada cifra se degrada
  // sola: si su consulta falla, la ficha abre igual.
  const desde7 = new URLSearchParams({ desde: desdeHace(7) }).toString();
  const [detalleRes, consola, fiabilidad, uso7, conversaciones7] = await Promise.all([
    agente.id ? apiFetch<AgentDetail>(`/admin/agents/${agente.id}`) : Promise.resolve(null),
    agente.id ? cargarConsola() : Promise.resolve(null),
    agente.id ? apiFetch<ReliabilityResponse>(`/admin/reliability?${desde7}`) : Promise.resolve(null),
    esMaster ? apiFetch<AgentUsage>(`${base}/usage?${desde7}`) : Promise.resolve(null),
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
  if (actual === "actividad" && ver === "conversaciones") {
    const res = await apiFetch<AgentConversationPage>(`${base}/conversations?${qs}`);
    if (res.ok) {
      contenido = <ConversacionesDelAgente page={res.data} nombre={agente.name} verCosto={esMaster} />;
      paginada = res.data;
      etiqueta = "conversaciones";
    } else contenido = <NoCargo que="las conversaciones" res={res} />;
  } else if (actual === "actividad" && ver === "tareas") {
    const res = await apiFetch<AgentTaskPage>(`${base}/tasks?${qs}`);
    if (res.ok) {
      contenido = (
        <div className="flex flex-col gap-4">
          <SegmentedControl
            label="Estado de las tareas"
            value={filtros.estado ?? "todas"}
            className="self-start"
            options={[
              { value: "todas", label: "Todas", href: hrefDeAgente(ref, vigente, { estado: null }) },
              { value: "open", label: "En curso", href: hrefDeAgente(ref, vigente, { estado: "open" }) },
              { value: "closed", label: "Cerradas", href: hrefDeAgente(ref, vigente, { estado: "closed" }) },
            ]}
          />
          <TareasDelAgente page={res.data} nombre={agente.name} />
        </div>
      );
      paginada = res.data;
      etiqueta = "tareas";
    } else contenido = <NoCargo que="las tareas" res={res} />;
  } else if (actual === "actividad" && ver === "clientes") {
    const res = await apiFetch<AgentCustomerPage>(`${base}/customers?${qs}`);
    if (res.ok) {
      contenido = <ClientesDelAgente customers={res.data} nombre={agente.name} />;
      paginada = res.data;
      etiqueta = "clientes";
    } else contenido = <NoCargo que="los clientes" res={res} />;
  } else if (actual === "actividad") {
    const res = await apiFetch<AgentRecordPage>(`${base}/records?${qs}`);
    if (res.ok) {
      contenido = <RegistrosDelAgente records={res.data} nombre={agente.name} />;
      paginada = res.data;
      etiqueta = "registros";
    } else contenido = <NoCargo que="los registros" res={res} />;
  } else if (actual === "atiende") {
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
  } else if (actual === "sabe" && agente.id) {
    const [superpoderes, modelos, plugins, requisitos, docs] = await Promise.all([
      tieneSuperpoderes(agente)
        ? apiFetch<SuperpowerPage>(`/admin/agent-superpowers?agent_id=${agente.id}&page_size=100`)
        : Promise.resolve(null),
      apiFetch<LlmModelCatalog>("/admin/agent-models?page_size=100"),
      apiFetch<PluginSummary[]>("/admin/plugins"),
      apiFetch<RequirementPage>(`/admin/agents/${agente.id}/requirements?page_size=100`),
      tieneConocimiento(agente)
        ? apiFetch<KnowledgeDocument[]>(`/pack/pack_knowledge/agents/${agente.id}/documents`)
        : Promise.resolve(null),
    ]);
    const nombre = nombresDeHabilidades(plugins.ok ? plugins.data : []);
    const borrador = detalle?.draft?.content as Record<string, unknown> | undefined;
    contenido = (
      <div className="grid items-start gap-6 xl:grid-cols-2">
        {/* Los superpoderes traen su propio título («Qué sabe hacer Ventas»). */}
        {superpoderes && (
          <div className="flex flex-col gap-3">
            {!superpoderes.ok ? (
              <NoCargo que="los superpoderes" res={superpoderes} />
            ) : !detalle ? (
              <NoCargo que="los superpoderes" res={detalleRes ?? superpoderes} />
            ) : (
              <SuperpoderesDelAgente
                agente={detalle}
                catalogo={superpoderes.data.items}
                minFrases={modelos.ok ? modelos.data.min_phrases : MIN_FRASES_POR_DEFECTO}
                nombreDeHabilidad={Object.fromEntries(superpoderes.data.items.map((p) => [p.skill, nombre(p.skill)]))}
                requisitos={requisitos.ok ? requisitos.data.items : []}
                puedeEditar={puedeEditar}
                cambiosSinPublicar={hayCambiosSinPublicar(detalle)}
              />
            )}
          </div>
        )}
        {docs && (
          <Seccion titulo="Documentos">
            {!docs.ok ? (
              <NoCargo que="los documentos" res={docs} />
            ) : (
              <ConocimientoDelAgente
                agenteId={agente.id}
                nombre={agente.name}
                documentos={docs.data}
                puedeEscribir={meRes.ok && puedeEscribirConocimiento(meRes.data)}
                usaConocimiento={borrador ? usaConocimiento(borrador) : false}
                puedeEditar={puedeEditar}
              />
            )}
          </Seccion>
        )}
      </div>
    );
  } else {
    const res = await apiFetch<AgentUsage>(`${base}/usage?${queryDeApi(filtros, new Date(), false)}`);
    contenido = res.ok ? (
      <ConsumoDelAgente usage={res.data} nombre={agente.name} creditosDelMes={creditosDelMes} verCosto={esMaster} />
    ) : (
      <NoCargo que="el consumo" res={res} />
    );
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
  // Las conexiones de la consola son las de «Dónde atiende»; sin consola, las del resumen.
  const conexiones =
    filasDeConexiones.length > 0
      ? filasDeConexiones.map((f) => ({ id: f.id, label: f.label }))
      : agente.connections.map((c) => ({ id: c.id, label: c.label }));
  const descripcion = [papelDelAgente(agente, detalle?.description), tieneConexiones(agente) ? dondeAtiende(conexiones) : null]
    .filter(Boolean)
    .join(" · ");
  const publicacion = estadoDePublicacion(agente.published, detalle?.latest_version);
  const archivado = estaArchivado(agente);
  const conFiltros = !PESTANAS_SIN_FILTROS.has(actual);

  return (
    <DetailPage
      header={{
        title: agente.name,
        description: descripcion,
        breadcrumbs: [{ label: "Agentes", href: "/agentes" }, { label: agente.name }],
        despuesDelTitulo: (
          <>
            <SelectorDeAgentes
              agentes={overviewRes.data.items.map((a) => ({ ref: a.ref, key: a.key, name: a.name, published: a.published }))}
              actual={ref}
            />
            {archivado ? (
              <Badge variant="neutral">Archivado</Badge>
            ) : (
              !agente.virtual &&
              (publicacion.tono === "success" ? (
                <Badge variant="success">{publicacion.label}</Badge>
              ) : (
                <Badge variant="neutral">{publicacion.label}</Badge>
              ))
            )}
          </>
        ),
        actions: (
          <>
            {agente.id && importacion?.ok && (
              <ImportarDatosDelAgente agenteId={agente.id} nombre={agente.name} estado={importacion.data} />
            )}
            {agente.id && datosDePrueba?.ok && (
              <DatosDePruebaDelAgente agenteId={agente.id} nombre={agente.name} estado={datosDePrueba.data} />
            )}
            {tieneConexiones(agente) && (
              <ProbarAgente
                nombre={agente.name}
                conexiones={filasDeConexiones}
                inicial={conexionParaProbar(filasDeConexiones, filtros.conexion)}
                asignarHref={asignarHref}
                abierto={ubicacion.probar}
              />
            )}
            {/* Archivado no se edita (la API responde 409): primero se reactiva. */}
            {puedeEditar && agente.kind === "specialist" && !archivado && (
              <Button asChild variant="accent">
                <Link href={`/agentes/${agente.id}/editar`}>Editar</Link>
              </Button>
            )}
            {puedeEditar && agente.id && puedeArchivar(agente) && (
              <ArchivarAgente agenteId={agente.id} nombre={agente.name} archivado={archivado} />
            )}
          </>
        ),
        tabs: (
          <div className="flex flex-col gap-4">
            <IndicadoresDelAgente
              conversaciones={indicador(conversaciones7, (d) => d.total)}
              resueltas={resueltas}
              creditosDelMes={creditosDelMes === null ? null : { valor: creditosDelMes }}
              costoUsd={indicador(uso7, (d) => d.total.cost_usd)}
            />
            <TabLinks
              label={`Pestañas de ${agente.name}`}
              size="compact"
              current={hrefDeAgente(ref, vigente, { tab: actual })}
              items={pestanas.map((p) => ({ label: p.label, href: hrefDeAgente(ref, vigente, { tab: p.id }) }))}
            />
          </div>
        ),
      }}
    >
      {conFiltros && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {actual === "actividad" && vistas.length > 1 ? (
            // En el celular el control se desplaza en vez de apretar las opciones.
            <div className="max-w-full overflow-x-auto">
              <SegmentedControl
                label="Qué ver"
                value={ver}
                className="w-max"
                options={vistas.map((v) => ({ value: v.id, label: v.label, href: hrefDeAgente(ref, vigente, { ver: v.id }) }))}
              />
            </div>
          ) : (
            <span />
          )}
          <AgentFilters
            dias={filtros.dias}
            hrefDias={(dias) => hrefDeAgente(ref, vigente, { dias })}
            conexion={filtros.conexion}
            connections={conexiones}
            hrefConexion={(conexion) => hrefDeAgente(ref, vigente, { conexion })}
          />
        </div>
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
