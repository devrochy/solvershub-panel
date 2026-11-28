import Link from "next/link";
import type { ReactNode } from "react";
import { Columns3, List, X } from "lucide-react";

import { AccionesDeFila } from "@/app/(app)/leads/_components/acciones-de-fila";
import { FiltrosAvanzados, type CampoAvanzado } from "@/app/(app)/leads/_components/filtros-avanzados";
import { FiltrosDeClientes } from "@/app/(app)/leads/_components/filtros-de-clientes";
import { ListPage } from "@/components/templates/list-page";
import { AgentIcon } from "@/components/domain/agent-icon";
import { AgenteSwitch } from "@/components/domain/cliente/agente-switch";
import { EtapaMenu } from "@/components/domain/cliente/etapa-menu";
import { TableroEmbudo } from "@/components/domain/cliente/tablero-embudo";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { BotonReintentar } from "@/components/ui/estado-de-error";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { apiFetch, getBusinessTimezone } from "@/lib/api/server";
import type { ConversationConnection, LeadFilter, LeadRow, LeadsResponse, Me } from "@/lib/api/types";
import {
  filtrosCon,
  filtrosDePacks,
  hrefFicha,
  MAX_FILAS_CSV,
  ordenValido,
  ORDEN_SEGUIMIENTO,
  COLUMNA_DE_VALOR,
  motivosParaElegir,
  ORDENES_CLIENTES,
  ORDENES_DE_VALOR,
  textoDeValor,
  puedeEditarClientes,
  puedeEnviarPlantilla,
  TONO_DE_ETAPA,
  telefonoVisible,
  textoDeActividad,
  valorDeFiltro,
} from "@/lib/clientes";
import { canalLabel } from "@/lib/labels";
import { consultaDeColumna, tarjetaDeFila, type ColumnaDeEmbudo } from "@/lib/embudo";
import { formatCellValue, formatNumber } from "@/lib/format";
import {
  ESTADO_DE_SEGUIMIENTO,
  ordenPorDefectoDeSeguimiento,
  seguimientoDeExtras,
  textoDeSeguimiento,
} from "@/lib/seguimiento";

type Fila = LeadRow;
type Columna = LeadsResponse["agents"][number]["columns"][number];

export type FiltrosClientesDeModulo = {
  q?: string;
  channel?: string;
  connection_id?: string;
  page?: string;
  filtro?: string | string[];
  orden?: string;
  /** `embudo` abre el tablero por etapas (HU-CRM-24); cualquier otro valor, la lista. */
  vista?: string;
};

/** ¿Esta página pide el tablero de embudo y el módulo puede mostrarlo? Necesita la etapa y quién la escribe. */
function pideEmbudo(sp: FiltrosClientesDeModulo, operable?: OperableDeModulo): boolean {
  return sp.vista === "embudo" && Boolean(operable?.etapa && operable.pluginDeEtapa);
}

/**
 * Lo que vuelve operable la lista de un módulo (HU-CRM-17): pestañas con contador por una opción del
 * pack (`etapa`), selects de otros filtros del pack (`filtros`), orden, última actividad y acciones por
 * fila. Las opciones y sus etiquetas las declara el pack en `filters`; aquí solo se elige cuáles se usan.
 */
export type OperableDeModulo = {
  /** Clave del filtro del pack que se muestra como pestañas con contador (`estado_lead`). */
  etapa?: string;
  /** Claves de otros filtros del pack que se muestran como selects (`clasificacion`). */
  filtros?: string[];
  /**
   * Plugin dueño de la etapa (`pack_commerce`): con él, quien puede escribir cambia la etapa desde
   * el menú de la columna (HU-CRM-19). Sin él la etapa es solo lectura.
   */
  pluginDeEtapa?: string;
  /**
   * Clave del filtro del pack con el seguimiento de cada lead (`seguimiento`, HU-CRM-21): pestañas con
   * contador (Vencidos, Hoy…), columna con la próxima acción y el orden «más atrasado».
   */
  seguimiento?: string;
  /**
   * Clave del filtro del pack con el motivo de la pérdida (`motivo_perdida`, HU-CRM-23): sus opciones son los
   * motivos que se piden al pasar un lead a «perdido» desde el menú de la etapa.
   */
  motivoDePerdida?: string;
  /** Clave del filtro por tramos del valor estimado (`valor`, HU-CRM-23): habilita sus órdenes y su columna en pesos. */
  valor?: string;
  /**
   * Clave del filtro que separa los clientes con datos de lead (`lead_datos`, rediseño de Clientes): sus opciones
   * `con`/`sin` se muestran como pestañas con contador, en vez de la pestaña Leads que existía aparte.
   */
  conDatos?: string;
};

/**
 * Agentes cuyas columnas se suman a las del módulo: el lead es del core desde ADR-0193 (agente `leads`), pero se
 * trabaja en Clientes de Ventas, que sigue contando al cliente que solo tiene lead.
 */
const COLUMNAS_QUE_SUMA: Record<string, string[]> = { ventas: ["leads"] };

/** Canales que se pueden filtrar en Clientes; «manual» reúne lo creado o importado desde el panel. */
const CANALES_FILTRO = ["whatsapp", "instagram", "messenger", "webchat", "email", "manual"];

/** Tono del tipo de cliente (el del perfil, no el segmento de compra de Ventas). */


type Faceta = NonNullable<LeadsResponse["facetas"]>[number];
type OpcionDeSelect = { value: string; label: string; disabled?: boolean };

/** Opciones de un filtro del pack con su contador, para un select: «Nuevo (3)», «Todas (12)». */
export function opcionesConConteo(filtro: LeadFilter, faceta?: Faceta, todas = "Todas"): OpcionDeSelect[] {
  return [
    { value: "", label: faceta ? `${todas} (${formatNumber(faceta.total)})` : todas },
    ...filtro.options.map((opcion) => ({
      value: `${filtro.key}:${opcion.value}`,
      label: faceta ? `${opcion.label} (${formatNumber(faceta.counts[opcion.value] ?? 0)})` : opcion.label,
    })),
  ];
}

/** «Todos · Con datos · Sin datos» con sus contadores; «Sin datos» incluye los clientes sin lead. */
export function opcionesDeDatos(filtro: LeadFilter, faceta?: Faceta): OpcionDeSelect[] {
  if (!faceta) return [{ value: "", label: "Todos" }, ...filtro.options.map((o) => ({ value: `${filtro.key}:${o.value}`, label: o.label }))];
  const con = faceta.counts.con ?? 0;
  const sin = (faceta.counts.sin ?? 0) + (faceta.sin_valor ?? 0);
  return [
    { value: "", label: `Todos (${formatNumber(faceta.total)})` },
    { value: `${filtro.key}:con`, label: `Con datos (${formatNumber(con)})` },
    { value: `${filtro.key}:sin`, label: `Sin datos (${formatNumber(sin)})` },
  ];
}

/** Columnas de la lista del módulo: las del agente y las de los que suma, sin repetir clave. */
export function columnasDeLaLista(agents: LeadsResponse["agents"], agente: string): Columna[] {
  const salida: Columna[] = [];
  for (const clave of [agente, ...(COLUMNAS_QUE_SUMA[agente] ?? [])]) {
    for (const columna of agents.find((a) => a.key === clave)?.columns ?? []) {
      if (!salida.some((c) => c.key === columna.key)) salida.push(columna);
    }
  }
  return salida;
}

/** Query de `/admin/leads` para la lista de un módulo: el agente, la búsqueda y la página (y, si es operable, filtros, orden y contadores). */
export function consultaClientesDeModulo(
  agente: string | undefined,
  sp: FiltrosClientesDeModulo,
  operable?: OperableDeModulo,
): URLSearchParams {
  const qs = new URLSearchParams();
  if (agente && agente !== "general") qs.set("agente", agente);
  if (sp.q?.trim()) qs.set("q", sp.q.trim());
  if (sp.channel) qs.set("channel", sp.channel);
  if (sp.connection_id) qs.set("connection_id", sp.connection_id);
  if (operable) {
    // En el tablero las columnas son las etapas: la etapa de la URL no filtra, y esta consulta solo trae
    // los contadores y las sumas (una fila basta); las tarjetas de cada columna se piden aparte.
    const embudo = pideEmbudo(sp, operable);
    let filtros = embudo && operable.etapa ? filtrosCon(sp.filtro, operable.etapa, "") : filtrosDePacks(sp.filtro);
    // El embudo solo tiene sentido con leads que ya tienen datos; los vacíos se ven en la lista con «Sin datos».
    if (embudo && operable.conDatos && !filtros.some((f) => f.startsWith(`${operable.conDatos}:`))) {
      filtros = [...filtros, `${operable.conDatos}:con`];
    }
    for (const f of filtros) qs.append("filtro", f);
    const orden = operable.seguimiento
      ? ordenPorDefectoDeSeguimiento(ordenValido(sp.orden), filtrosDePacks(sp.filtro), operable.seguimiento)
      : ordenValido(sp.orden);
    if (orden && orden !== "alta") qs.set("orden", orden);
    if (operable.etapa) qs.append("facetas", operable.etapa);
    if (operable.seguimiento) qs.append("facetas", operable.seguimiento);
    if (operable.conDatos) qs.append("facetas", operable.conDatos);
    if (embudo) {
      qs.set("resumen", "valor");
      qs.set("page_size", "1");
      return qs;
    }
  }
  if (sp.page) qs.set("page", sp.page);
  return qs;
}

/**
 * Lista de clientes de un módulo (HU-CRM-12, ADR-0179): los clientes con datos reales de un
 * agente (Ventas, Agenda…), con las columnas que ese agente declara. Usa `/admin/leads?agente=`
 * del mismo endpoint que Operación › Clientes; cada fila abre la ficha en la pestaña del agente.
 * Con `operable` (Ventas) suma pestañas por etapa con contador, filtros, orden, chips, última
 * actividad, acciones rápidas (WhatsApp, llamar, plantilla) y tarjetas en móvil (HU-CRM-17).
 */
export async function ClientesDeModulo({
  agente,
  basePath,
  titulo,
  descripcion,
  sp,
  helpSection,
  vacioDescripcion,
  operable,
  etiquetaDeLista,
  directorio = false,
  columnasDe,
  columnasOcultas = [],
  ficha,
  headerActions,
  sesion,
}: {
  /** Clave del agente en `agents[].key` (`ventas`, `agenda`…). Sin agente, la lista global de Clientes. */
  agente?: string;
  /** Ruta de esta página, para la paginación y la búsqueda. */
  basePath: string;
  titulo: string;
  descripcion: string;
  sp: FiltrosClientesDeModulo;
  helpSection?: string;
  vacioDescripcion: string;
  operable?: OperableDeModulo;
  /** Nombre de la lista para lectores de pantalla cuando el título es el de la sección («Clientes de Agenda»). */
  etiquetaDeLista?: string;
  /** Vista de la sección Clientes: avatar, tipo de cliente, interruptor del agente y origen. */
  directorio?: boolean;
  /** Agente del que se toman las columnas cuando `agente` no filtra (en Clientes, `leads`). */
  columnasDe?: string;
  /** Columnas del pack que no se pintan porque tienen su propia columna (etapa, seguimiento, origen…). */
  columnasOcultas?: string[];
  /** La ficha lateral de la misma página, para que abrir un cliente no cambie de sección. */
  ficha?: ReactNode;
  /** Acciones extra de la cabecera (Nuevo lead, Importar, Captación), antes de Exportar CSV. */
  headerActions?: ReactNode;
  /** La sesión ya cargada por la página; evita pedir `/admin/me` dos veces. */
  sesion?: Me | null;
}) {
  const nombreDeLista = etiquetaDeLista ?? titulo;
  const qs = consultaClientesDeModulo(agente, sp, operable);
  const embudoPedido = pideEmbudo(sp, operable);
  // En el tablero la etapa de la URL no filtra: las columnas ya son las etapas.
  const filtroSp = embudoPedido && operable?.etapa ? filtrosCon(sp.filtro, operable.etapa, "") : sp.filtro;
  const [res, meRes, zona, conexiones] = await Promise.all([
    apiFetch<LeadsResponse>(`/admin/leads?${qs.toString()}`),
    operable && sesion === undefined ? apiFetch<Me>("/admin/me") : null,
    operable?.seguimiento ? getBusinessTimezone() : null,
    directorio ? apiFetch<ConversationConnection[]>("/admin/conversations/connections") : null,
  ]);
  const me = sesion === undefined ? (meRes?.ok ? meRes.data : null) : sesion;
  const conexionesLista = conexiones?.ok ? conexiones.data : [];
  const { items, agents, page, has_more, total, filters, facetas } = res.ok
    ? res.data
    : { items: [] as Fila[], agents: [], page: 1, has_more: false, total: 0, filters: [] as LeadFilter[], facetas: [] };
  const columnasDelAgente = columnasDeLaLista(agents, columnasDe ?? agente ?? "general").filter(
    (columna) => !columnasOcultas.includes(columna.key),
  );
  const puedeEnviar = me ? puedeEnviarPlantilla(me) : false;
  const puedeCambiarEtapa = Boolean(operable?.pluginDeEtapa) && (me ? puedeEditarClientes(me) : false);

  // — Etapas (pestañas) y filtros declarados por el pack —
  const filtroDeEtapa = operable?.etapa ? filters?.find((f) => f.key === operable.etapa) : undefined;
  const faceta = operable?.etapa ? facetas?.find((f) => f.key === operable.etapa) : undefined;
  // Sin contadores (backend viejo) la etapa degrada a un select como los demás filtros.
  const etapaComoPestanas = Boolean(filtroDeEtapa && faceta);
  const filtrosEnSelect = (filters ?? []).filter(
    (f) => operable?.filtros?.includes(f.key) || (f.key === operable?.etapa && !etapaComoPestanas),
  );
  const etapaActual = operable?.etapa ? valorDeFiltro(filtroSp, operable.etapa) : "";

  // — Con datos / sin datos del lead: reemplaza la pestaña Leads que vivía aparte —
  const filtroDeDatos = operable?.conDatos ? filters?.find((f) => f.key === operable.conDatos) : undefined;
  const facetaDeDatos = operable?.conDatos ? facetas?.find((f) => f.key === operable.conDatos) : undefined;
  const datosActual = operable?.conDatos ? valorDeFiltro(filtroSp, operable.conDatos) : "";

  // — Seguimiento (HU-CRM-21): pestañas con contador cuando el backend trae el filtro y sus contadores —
  const filtroDeSeguimiento = operable?.seguimiento ? filters?.find((f) => f.key === operable.seguimiento) : undefined;
  const facetaDeSeguimiento = operable?.seguimiento ? facetas?.find((f) => f.key === operable.seguimiento) : undefined;
  const seguimientoActual = operable?.seguimiento ? valorDeFiltro(filtroSp, operable.seguimiento) : "";
  const filtroDeValor = operable?.valor ? filters?.find((f) => f.key === operable.valor) : undefined;
  const motivosDePerdida = motivosParaElegir(
    operable?.motivoDePerdida ? filters?.find((f) => f.key === operable.motivoDePerdida)?.options : undefined,
  );
  const ordenActual =
    (operable?.seguimiento
      ? ordenPorDefectoDeSeguimiento(ordenValido(sp.orden), filtrosDePacks(filtroSp), operable.seguimiento)
      : ordenValido(sp.orden)) ?? "alta";

  // — Tablero de embudo (HU-CRM-24): solo con contadores de etapa; sin ellos (backend viejo) se queda la lista —
  const modoEmbudo = embudoPedido && etapaComoPestanas;
  const puedeVerEmbudo = Boolean(operable?.pluginDeEtapa) && etapaComoPestanas;
  const ordenDelTablero = ordenActual === "alta" ? undefined : ordenActual;
  // El embudo solo pinta leads con datos, igual que la consulta principal, aunque el usuario esté en «Todos».
  const filtrosDelTablero =
    embudoPedido && operable?.conDatos && !filtrosDePacks(filtroSp).some((f) => f.startsWith(`${operable.conDatos}:`))
      ? [...filtrosDePacks(filtroSp), `${operable.conDatos}:con`]
      : filtrosDePacks(filtroSp);
  const columnasDeEmbudo: ColumnaDeEmbudo[] =
    modoEmbudo && filtroDeEtapa && operable?.etapa
      ? await columnasDelTablero({
          agente,
          q: sp.q,
          filtros: filtrosDelTablero,
          orden: ordenDelTablero,
          etapa: operable.etapa,
          filtro: filtroDeEtapa,
          faceta,
        })
      : [];
  const sinLeadDeVenta = faceta?.sin_valor ?? 0;

  const hrefCon = (cambios: {
    q?: string | null;
    channel?: string | null;
    connection_id?: string | null;
    filtro?: string[];
    orden?: string | null;
    vista?: "lista" | "embudo";
  }) => {
    const next = new URLSearchParams();
    const q = cambios.q === undefined ? sp.q?.trim() : cambios.q;
    if (q) next.set("q", q);
    const canal = cambios.channel === undefined ? sp.channel : cambios.channel;
    if (canal) next.set("channel", canal);
    const conexion = cambios.connection_id === undefined ? sp.connection_id : cambios.connection_id;
    if (conexion) next.set("connection_id", conexion);
    for (const f of cambios.filtro ?? filtrosDePacks(filtroSp)) next.append("filtro", f);
    const orden = cambios.orden === undefined ? ordenValido(sp.orden) : cambios.orden;
    if (orden && orden !== "alta") next.set("orden", orden);
    if ((cambios.vista ?? (embudoPedido ? "embudo" : "lista")) === "embudo") next.set("vista", "embudo");
    return `${basePath}${next.size ? `?${next.toString()}` : ""}`;
  };

  // La ficha se abre encima de la misma lista: conserva la vista y los filtros al cerrarla (rediseño de Clientes).
  const qsFicha = new URLSearchParams();
  if (sp.q?.trim()) qsFicha.set("q", sp.q.trim());
  if (sp.channel) qsFicha.set("channel", sp.channel);
  if (sp.connection_id) qsFicha.set("connection_id", sp.connection_id);
  for (const f of filtrosDePacks(filtroSp)) qsFicha.append("filtro", f);
  if (embudoPedido) qsFicha.set("vista", "embudo");

  type Chip = { clave: string; texto: string; quitarLabel: string; href: string };
  const chips: Chip[] = [];
  if (operable) {
    if (sp.q?.trim()) {
      chips.push({ clave: "q", texto: `Búsqueda: ${sp.q.trim()}`, quitarLabel: "Quitar la búsqueda", href: hrefCon({ q: null }) });
    }
    if (sp.channel) {
      chips.push({
        clave: "channel",
        texto: `Canal: ${canalLabel(sp.channel)}`,
        quitarLabel: "Quitar el canal",
        href: hrefCon({ channel: null }),
      });
    }
    if (sp.connection_id) {
      const conexion = conexionesLista.find((c) => c.id === sp.connection_id)?.label ?? "la conexión";
      chips.push({
        clave: "connection_id",
        texto: `Conexión: ${conexion}`,
        quitarLabel: "Quitar la conexión",
        href: hrefCon({ connection_id: null }),
      });
    }
    for (const f of filters ?? []) {
      const valor = valorDeFiltro(filtroSp, f.key);
      if (!valor) continue;
      const opcion = f.options.find((o) => o.value === valor)?.label ?? valor;
      chips.push({
        clave: f.key,
        texto: `${f.label}: ${opcion}`,
        quitarLabel: `Quitar el filtro ${f.label}: ${opcion}`,
        href: hrefCon({ filtro: filtrosCon(filtroSp, f.key, "") }),
      });
    }
  }
  const hayFiltros = chips.length > 0 || Boolean(sp.q?.trim());

  const etiquetaDeEtapa = (lead: Fila): { texto: string; codigo: string } | null => {
    const texto = operable?.etapa ? lead.extras[operable.etapa] : null;
    if (typeof texto !== "string" || !texto) return null;
    const codigo = filtroDeEtapa?.options.find((o) => o.label === texto)?.value ?? "";
    return { texto, codigo };
  };

  const badgeDeEtapa = (lead: Fila, grande = false) => {
    const etapa = etiquetaDeEtapa(lead);
    if (etapa && puedeCambiarEtapa && operable?.etapa && operable.pluginDeEtapa && filtroDeEtapa) {
      return (
        <EtapaMenu
          leadId={lead.id}
          nombre={lead.perfil.nombre_visible}
          pluginId={operable.pluginDeEtapa}
          clave={operable.etapa}
          actual={etapa.codigo}
          texto={etapa.texto}
          opciones={filtroDeEtapa.options}
          motivos={motivosDePerdida}
          grande={grande}
        />
      );
    }
    return etapa ? (
      <Badge variant={TONO_DE_ETAPA[etapa.codigo] ?? "neutral"}>{etapa.texto}</Badge>
    ) : (
      <span className="text-xs text-text-soft">{directorio ? "Sin etapa" : "Sin lead de venta"}</span>
    );
  };



  /** Cómo entró el lead y, si existe, por qué conexión. El canal ya va debajo del teléfono. */
  const origenDeFila = (lead: Fila) => {
    const origen = (typeof lead.extras["origen"] === "string" && lead.extras["origen"]) || "—";
    const etiquetas = (lead.conexiones ?? []).map((conexion) => conexion.label);
    const conexion =
      etiquetas.length > 1 ? `${etiquetas[0]} +${etiquetas.length - 1}` : etiquetas[0];
    return (
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-body">{origen}</span>
        {conexion && conexion !== origen && (
          <span className="truncate text-xs text-text-soft" title={etiquetas.join(" · ")}>
            {conexion}
          </span>
        )}
      </div>
    );
  };

  /** Teléfono o, si no hay, correo: un lead creado a mano puede tener solo uno de los dos. */
  const contactoDeFila = (lead: Fila) => {
    const telefono = telefonoVisible(lead.perfil);
    return telefono !== "—" ? telefono : (lead.perfil.email ?? "—");
  };

  /** Módulos con datos reales de este cliente (sin «General» ni el lead del core, que no son módulos). */
  const modulosDeFila = (lead: Fila) =>
    lead.agentes
      .filter((clave) => clave !== "general" && clave !== "leads")
      // El provider de Ventas suma el lead con datos; para «También en» solo cuenta una compra o cotización real.
      .filter((clave) => {
        if (clave !== "ventas") return true;
        const pedidos = Number(lead.extras["pedidos"] ?? 0);
        const total = Number(lead.extras["total_compras"] ?? 0);
        const cotizaciones = Number(lead.extras["cotizaciones_abiertas"] ?? 0);
        return pedidos > 0 || total > 0 || cotizaciones > 0;
      })
      .map((clave) => {
        const agente = agents.find((a) => a.key === clave);
        return { key: clave, name: agente?.name ?? clave };
      });

  /** Próxima acción del lead: «Vencido» (texto y color), la fecha en hora del negocio y la nota. */
  const seguimientoDeFila = (lead: Fila) => {
    const seg = seguimientoDeExtras(lead.extras);
    if (!seg) return <span className="text-xs text-text-soft">Sin seguimiento</span>;
    const estado = seg.estado ? ESTADO_DE_SEGUIMIENTO[seg.estado] : null;
    return (
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-1.5">
          {estado && <Badge variant={estado.tono}>{estado.texto}</Badge>}
          <span className="text-xs text-body">{textoDeSeguimiento(seg.en, zona ?? undefined)}</span>
        </span>
        {seg.nota && <span className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-text-soft">{seg.nota}</span>}
      </div>
    );
  };

  const accionesDeFila = (lead: Fila) => (
    <div className="relative z-10 flex items-center justify-end">
      <AccionesDeFila lead={lead} puedeEnviar={puedeEnviar} />
    </div>
  );

  const columnasDelPack = columnasDelAgente
    // La etapa y el seguimiento tienen su propia columna: no se repiten como texto.
    .filter((columna) => columna.key !== operable?.etapa && columna.key !== "seguimiento_nota")
    .map(
      (columna): Column<Fila> => ({
        key: `extra-${columna.key}`,
        header: columna.key === COLUMNA_DE_VALOR ? "Valor del lead" : columna.label,
        info:
          columna.key === COLUMNA_DE_VALOR
            ? "Lo que el negocio estima que vale esta oportunidad. Se usa en el embudo y en Ventas."
            : undefined,
        cell: (lead) => (
          <span className="text-body">
            {columna.key === COLUMNA_DE_VALOR
              ? textoDeValor(lead.extras[columna.key])
              : formatCellValue(lead.extras[columna.key])}
          </span>
        ),
      }),
    );

  const columns: Column<Fila>[] = directorio
    ? [
        {
          key: "cliente",
          header: "Cliente",
          cell: (lead) => (
            <div className="flex items-center gap-3">
              <Avatar name={lead.perfil.nombre_visible} src={lead.perfil.avatar_url} size="sm" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-headline">{lead.perfil.nombre_visible}</span>
                {lead.perfil.alias && lead.perfil.alias !== lead.perfil.nombre_visible && (
                  <span className="truncate text-xs text-text-soft">Alias: {lead.perfil.alias}</span>
                )}
              </div>
            </div>
          ),
        },
        ...(operable?.etapa
          ? [
              {
                key: "etapa",
                header: "Etapa",
                info: "El agente la mueve al calificar o al actualizar el lead; cada cambio queda con quién lo hizo.",
                cell: (lead) => <div className="relative z-10 w-fit">{badgeDeEtapa(lead)}</div>,
              } satisfies Column<Fila>,
            ]
          : []),
        ...(operable?.seguimiento
          ? [
              {
                key: "seguimiento",
                header: "Próxima acción",
                info: "La programa una persona desde la ficha o el alta. El agente no crea seguimientos.",
                cell: (lead) => seguimientoDeFila(lead),
              } satisfies Column<Fila>,
            ]
          : []),
        {
          key: "contacto",
          header: "Contacto",
          cell: (lead) => (
            <div className="flex flex-col whitespace-nowrap">
              <span className="tabular-nums text-body">{contactoDeFila(lead)}</span>
              <span className="text-xs text-text-soft">{canalLabel(lead.canal)}</span>
            </div>
          ),
        },
        {
          key: "origen",
          header: "Origen",
          info: "Cómo entró el lead y, si aplica, por qué conexión llegó. El canal está en Contacto.",
          className: "max-xl:hidden",
          cell: (lead) => origenDeFila(lead),
        },
        {
          key: "actividad",
          header: "Última actividad",
          className: "max-lg:hidden",
          cell: (lead) => <span className="text-body">{textoDeActividad(lead.ultima_actividad)}</span>,
        },
        ...columnasDelPack,
        {
          key: "modulos",
          header: "También en",
          info: "Módulos donde este cliente también tiene datos. El detalle vive en la sección de cada módulo; «Solo lead» significa que no hay más datos fuera del lead.",
          className: "max-2xl:hidden",
          cell: (lead) => {
            const modulos = modulosDeFila(lead);
            if (!modulos.length) return <span className="text-xs text-text-soft">Solo lead</span>;
            return (
              <div className="flex items-center gap-1">
                {modulos.map((modulo) => (
                  <span key={modulo.key} role="img" aria-label={`Con datos en ${modulo.name}`} title={modulo.name}>
                    <AgentIcon agentKey={modulo.key} name={modulo.name} />
                  </span>
                ))}
              </div>
            );
          },
        },
        {
          key: "agente",
          header: "Agente",
          info: "Activo: el agente responde a este cliente. Pausado: el agente no le responde.",
          cell: (lead) => (
            <div className="relative z-10 flex w-fit items-center gap-2">
              <AgenteSwitch
                leadId={lead.id}
                botPaused={lead.bot_paused ?? false}
                nombre={lead.perfil.nombre_visible}
              />
              <span className="text-body">{lead.bot_paused ? "Pausado" : "Activo"}</span>
            </div>
          ),
        },
        ...(operable
          ? [
              {
                key: "acciones",
                header: "Acciones",
                align: "right",
                cell: (lead) => accionesDeFila(lead),
              } satisfies Column<Fila>,
            ]
          : []),
      ]
    : [
        {
          key: "cliente",
          header: "Cliente",
          cell: (lead) => <span className="truncate font-medium text-headline">{lead.perfil.nombre_visible}</span>,
        },
        ...(operable?.etapa
          ? [
              {
                key: "etapa",
                header: "Etapa",
                cell: (lead) => <div className="relative z-10 w-fit">{badgeDeEtapa(lead)}</div>,
              } satisfies Column<Fila>,
            ]
          : []),
        ...(operable?.seguimiento
          ? [{ key: "seguimiento", header: "Seguimiento", cell: (lead) => seguimientoDeFila(lead) } satisfies Column<Fila>]
          : []),
        {
          key: "telefono",
          header: "Teléfono",
          cell: (lead) => <span className="text-body">{telefonoVisible(lead.perfil)}</span>,
        },
        ...(operable
          ? [
              {
                key: "actividad",
                header: "Última actividad",
                cell: (lead) => <span className="text-body">{textoDeActividad(lead.ultima_actividad)}</span>,
              } satisfies Column<Fila>,
            ]
          : []),
        ...columnasDelPack,
        ...(operable
          ? [
              {
                key: "acciones",
                header: "Acciones",
                align: "right",
                cell: (lead) => accionesDeFila(lead),
              } satisfies Column<Fila>,
            ]
          : []),
      ];

  const csv = new URLSearchParams();
  if (agente && agente !== "general") csv.set("agente", agente);
  if (operable) {
    if (sp.q?.trim()) csv.set("q", sp.q.trim());
    if (sp.channel) csv.set("channel", sp.channel);
    if (sp.connection_id) csv.set("connection_id", sp.connection_id);
    for (const f of filtrosDePacks(filtroSp)) csv.append("filtro", f);
  }
  const csvTruncado = Boolean(operable) && res.ok && total > MAX_FILAS_CSV;

  // La etapa, el seguimiento y «datos del lead» tienen su propio select con contadores; el resto va en Más filtros.
  const filtrosSecundarios = filtrosEnSelect.filter(
    (f) => !["estado_lead", "seguimiento", operable?.conDatos].includes(f.key),
  );
  const opcionesEtapa = filtroDeEtapa ? opcionesConConteo(filtroDeEtapa, faceta) : [];
  if (filtroDeEtapa && faceta?.sin_valor) {
    opcionesEtapa.push({
      value: "__sin_etapa",
      label: `Sin etapa (${formatNumber(faceta.sin_valor)})`,
      disabled: true,
    });
  }
  const opcionesSeguimiento = filtroDeSeguimiento
    ? opcionesConConteo(filtroDeSeguimiento, facetaDeSeguimiento, "Todos")
    : [];
  const opcionesDatos = filtroDeDatos ? opcionesDeDatos(filtroDeDatos, facetaDeDatos) : [];
  const camposAvanzados: CampoAvanzado[] = [
    ...(filtroDeDatos
      ? [
          {
            key: filtroDeDatos.key,
            label: "Datos del lead",
            value: datosActual ? `${filtroDeDatos.key}:${datosActual}` : "",
            options: opcionesDatos,
            help: "Con datos: nombre, teléfono, correo o interés.",
          } satisfies CampoAvanzado,
        ]
      : []),
    ...filtrosSecundarios.map(
      (f): CampoAvanzado => ({
        key: f.key,
        label: f.key === operable?.valor ? "Valor del lead" : f.label,
        help:
          f.key === operable?.valor
            ? "Lo que estimas que vale la oportunidad. No es el total comprado en Ventas."
            : undefined,
        value: valorDeFiltro(filtroSp, f.key) ? `${f.key}:${valorDeFiltro(filtroSp, f.key)}` : "",
        options: [
          { value: "", label: "Todos" },
          ...f.options.map((o) => ({ value: `${f.key}:${o.value}`, label: o.label })),
        ],
      }),
    ),
  ];
  const activosAvanzados = camposAvanzados.filter((campo) => Boolean(campo.value)).length;
  const ocultos: { name: string; value: string }[] = [
    ...(sp.q?.trim() ? [{ name: "q", value: sp.q.trim() }] : []),
    ...(sp.channel ? [{ name: "channel", value: sp.channel }] : []),
    ...(sp.connection_id ? [{ name: "connection_id", value: sp.connection_id }] : []),
    ...(etapaActual && filtroDeEtapa ? [{ name: "filtro", value: `${filtroDeEtapa.key}:${etapaActual}` }] : []),
    ...(seguimientoActual && filtroDeSeguimiento
      ? [{ name: "filtro", value: `${filtroDeSeguimiento.key}:${seguimientoActual}` }]
      : []),
    ...(ordenActual !== "alta" ? [{ name: "orden", value: ordenActual }] : []),
    ...(modoEmbudo ? [{ name: "vista", value: "embudo" }] : []),
  ];
  const limpiarAvanzados = hrefCon({
    filtro: filtrosDePacks(filtroSp).filter((f) => !camposAvanzados.some((campo) => f.startsWith(`${campo.key}:`))),
  });

  const vistaControl = puedeVerEmbudo ? (
    <SegmentedControl
      label="Vista de los clientes"
      className="ml-auto"
      value={modoEmbudo ? "embudo" : "lista"}
      options={[
        { value: "lista", label: "Lista", href: hrefCon({ vista: "lista" }), icon: <List aria-hidden /> },
        { value: "embudo", label: "Embudo", href: hrefCon({ vista: "embudo" }), icon: <Columns3 aria-hidden /> },
      ]}
    />
  ) : null;

  const filtrosForm = (
    <>
      <FiltrosDeClientes activos={chips.length}>
        <form method="get" action={basePath} className="flex w-full flex-wrap items-end gap-3">
      {modoEmbudo && <input type="hidden" name="vista" value="embudo" />}
      {/* La etapa elegida en las pestañas no es un campo del formulario: se conserva al filtrar. */}
      {etapaComoPestanas && etapaActual && operable?.etapa && (
        <input type="hidden" name="filtro" value={`${operable.etapa}:${etapaActual}`} />
      )}
      {operable?.conDatos && datosActual && (
        <input type="hidden" name="filtro" value={`${operable.conDatos}:${datosActual}`} />
      )}
      {directorio && (
        <Field label="Canal" htmlFor="channel" className="w-44">
          <Select id="channel" name="channel" defaultValue={sp.channel ?? ""}>
            <option value="">Todos los canales</option>
            {CANALES_FILTRO.map((canal) => (
              <option key={canal} value={canal}>
                {canalLabel(canal)}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {directorio && conexionesLista.length > 1 && (
        <Field label="Conexión" htmlFor="connection_id" className="w-52">
          <Select id="connection_id" name="connection_id" defaultValue={sp.connection_id ?? ""}>
            <option value="">Todas las conexiones</option>
            {conexionesLista.map((conexion) => (
              <option key={conexion.id} value={conexion.id}>
                {conexion.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {directorio && sp.connection_id && conexionesLista.length <= 1 && (
        <input type="hidden" name="connection_id" value={sp.connection_id} />
      )}
      <Field label="Buscar" htmlFor="q" className="w-72 max-w-full">
        <Input id="q" name="q" type="search" defaultValue={sp.q ?? ""} placeholder="Nombre o teléfono" />
      </Field>
      {filtroDeEtapa && (
        <Field label="Etapa" htmlFor="filtro-estado_lead" className="w-44">
          <Select
            id="filtro-estado_lead"
            name="filtro"
            defaultValue={etapaActual ? `${filtroDeEtapa.key}:${etapaActual}` : ""}
          >
            {opcionesEtapa.map((opcion) => (
              <option key={opcion.value || "todas"} value={opcion.value} disabled={opcion.disabled}>
                {opcion.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {filtroDeSeguimiento && (
        <Field label="Seguimiento" htmlFor="filtro-seguimiento" className="w-44">
          <Select
            id="filtro-seguimiento"
            name="filtro"
            defaultValue={seguimientoActual ? `${filtroDeSeguimiento.key}:${seguimientoActual}` : ""}
          >
            {opcionesSeguimiento.map((opcion) => (
              <option key={opcion.value || "todos"} value={opcion.value}>
                {opcion.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <FiltrosAvanzados
        basePath={basePath}
        campos={camposAvanzados}
        ocultos={ocultos}
        activos={activosAvanzados}
        limpiarHref={limpiarAvanzados}
      />
      {operable && (
        <Field label="Ordenar por" htmlFor="orden" className="w-48">
          <Select id="orden" name="orden" defaultValue={ordenActual}>
            {[
              ...ORDENES_CLIENTES,
              ...(filtroDeSeguimiento ? [ORDEN_SEGUIMIENTO] : []),
              ...(filtroDeValor ? ORDENES_DE_VALOR : []),
            ].map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Button type="submit" variant="outline" className={operable ? undefined : "sr-only"}>
        {operable ? "Filtrar" : "Buscar"}
      </Button>
      {hayFiltros && (
        <Link href={basePath} className="pb-2.5 text-sm text-link hover:underline">
          {operable ? "Limpiar todo" : "Limpiar"}
        </Link>
      )}
        </form>
      </FiltrosDeClientes>
      {vistaControl}
    </>
  );

  const hayFilas = res.ok && items.length > 0;
  const tabla = (
    <DataTable
      columns={columns}
      rows={modoEmbudo ? [] : items}
      getRowKey={(lead) => lead.id}
      emptyTitle={
        directorio
          ? hayFiltros
            ? "No hay clientes con estos filtros"
            : "Sin clientes todavía"
          : operable && hayFiltros
            ? "Ningún cliente coincide"
            : "Sin clientes todavía"
      }
      emptyDescription={
        directorio
          ? hayFiltros
            ? "Prueba con otra búsqueda o quita los filtros."
            : vacioDescripcion
          : operable && hayFiltros
            ? "Prueba con otra etapa o quita algún filtro para ver más clientes."
            : vacioDescripcion
      }
      emptyAction={
        (directorio || operable) && hayFiltros ? (
          <Button asChild variant="outline" size="sm">
            <Link href={basePath}>Limpiar filtros</Link>
          </Button>
        ) : undefined
      }
      error={res.ok ? null : `No se pudieron cargar los clientes: ${res.error}`}
      errorTitle="No pudimos cargar los clientes"
      errorAction={
        directorio ? (
          <BotonReintentar />
        ) : operable ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefCon({})}>Reintentar</Link>
          </Button>
        ) : undefined
      }
      caption={nombreDeLista}
      serverPaginated
      getRowHref={(lead) => hrefFicha(lead.id, { agente, qs: qsFicha })}
      getRowLabel={(lead) => `Abrir la ficha de ${lead.perfil.nombre_visible}`}
    />
  );

  return (
    <ListPage
      header={{
        title: titulo,
        description: descripcion,
        helpSection,
        actions:
          headerActions || operable ? (
            <>
              {operable && (
                <Button asChild variant="outline">
                  <a href={`/api/leads/export?${csv.toString()}`} download>
                    Exportar CSV
                  </a>
                </Button>
              )}
              {headerActions}
            </>
          ) : undefined,
      }}
      filters={filtrosForm}
    >
      {modoEmbudo && operable?.conDatos && (
        <p className="text-xs text-text-soft">
          El embudo muestra solo clientes con datos de lead. Los contactos sin datos quedan en la lista, filtro
          «Sin datos».
        </p>
      )}

      {chips.length > 0 && (
        <ul aria-label="Filtros activos" className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <li key={chip.clave}>
              <Link
                href={chip.href}
                aria-label={chip.quitarLabel}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-hover px-3 text-sm text-body transition-colors hover:text-headline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                {chip.texto}
                <X className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {csvTruncado && (
        <p role="status" className="text-sm text-text-soft">
          El CSV incluye solo los {formatNumber(MAX_FILAS_CSV)} clientes más recientes de {formatNumber(total)}. Filtra por
          etapa o búsqueda para exportar el resto.
        </p>
      )}

      {modoEmbudo && sinLeadDeVenta > 0 && (
        <p className="text-xs text-text-soft">
          {formatNumber(sinLeadDeVenta)} {sinLeadDeVenta === 1 ? "cliente aún no tiene" : "clientes aún no tienen"}{" "}
          {directorio ? "una etapa" : "lead de venta"} y no aparecen en ninguna etapa.
        </p>
      )}

      {modoEmbudo && operable?.etapa && operable.pluginDeEtapa && columnasDeEmbudo.some((c) => c.total > 0) ? (
        <TableroEmbudo
          key={JSON.stringify(columnasDeEmbudo.map((c) => [c.value, c.total, c.tarjetas[0]?.id ?? ""]))}
          titulo={titulo}
          columnas={columnasDeEmbudo}
          pluginId={operable.pluginDeEtapa}
          clave={operable.etapa}
          motivos={motivosDePerdida}
          puedeMover={puedeCambiarEtapa}
          consulta={{ agente, q: sp.q?.trim() || undefined, filtros: filtrosDelTablero, orden: ordenDelTablero }}
        />
      ) : operable && hayFilas && !modoEmbudo ? (
        <>
          <div className="hidden md:block">{tabla}</div>
          <ul className="flex flex-col gap-3 md:hidden" aria-label={nombreDeLista}>
            {items.map((lead) => (
              <li key={lead.id} className="flex flex-col gap-2 rounded-lg border border-border-soft bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={hrefFicha(lead.id, { agente, qs: qsFicha })}
                    className="inline-flex min-h-11 min-w-0 items-center font-medium text-link hover:underline"
                  >
                    {lead.perfil.nombre_visible}
                  </Link>
                  {operable.etapa && badgeDeEtapa(lead, true)}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-body">
                    {contactoDeFila(lead)}
                    <span className="ml-2 text-xs text-text-soft">{canalLabel(lead.canal)}</span>
                  </p>
                </div>
                {operable.seguimiento && seguimientoDeFila(lead)}
                <p className="text-xs text-text-soft">Última actividad: {textoDeActividad(lead.ultima_actividad)}</p>
                {directorio && (
                  <div className="flex items-center justify-between gap-2 rounded-md bg-hover/40 px-3 py-2">
                    <span className="text-xs text-text-soft">Agente para este cliente</span>
                    <AgenteSwitch
                      leadId={lead.id}
                      botPaused={lead.bot_paused ?? false}
                      nombre={lead.perfil.nombre_visible}
                    />
                  </div>
                )}
                {accionesDeFila(lead)}
              </li>
            ))}
          </ul>
        </>
      ) : !operable && hayFilas ? (
        <>
          <div className="hidden md:block">{tabla}</div>
          <ul className="overflow-hidden rounded-lg border border-border-soft bg-surface md:hidden" aria-label={nombreDeLista}>
            {items.map((lead) => (
              <li key={lead.id} className="relative flex min-h-16 items-center gap-3 border-b border-border-soft px-4 py-3 last:border-b-0">
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    href={hrefFicha(lead.id, { agente, qs: qsFicha })}
                    className="truncate text-sm font-medium text-headline outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus"
                  >
                    {lead.perfil.nombre_visible}
                  </Link>
                  <span className="text-xs text-text-soft">{telefonoVisible(lead.perfil)}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        tabla
      )}

      {res.ok && !modoEmbudo && (
        <Pagination
          page={page}
          hasMore={has_more}
          total={total}
          label="clientes"
          singular="cliente"
          makeHref={(target) => {
            const next = new URLSearchParams(qs);
            next.delete("agente");
            next.delete("facetas");
            next.set("page", String(target));
            return `${basePath}?${next.toString()}`;
          }}
        />
      )}
      {ficha}
    </ListPage>
  );
}

/**
 * Las columnas del tablero (HU-CRM-24): para cada etapa del pack, su cantidad y su suma (de los contadores)
 * y sus primeras tarjetas. Las páginas se piden en paralelo y una columna que falla no tumba el tablero.
 */
async function columnasDelTablero({
  agente,
  q,
  filtros,
  orden,
  etapa,
  filtro,
  faceta,
}: {
  agente?: string;
  q?: string;
  filtros: string | string[] | undefined;
  orden?: string;
  etapa: string;
  filtro: LeadFilter;
  faceta: NonNullable<LeadsResponse["facetas"]>[number] | undefined;
}): Promise<ColumnaDeEmbudo[]> {
  const qsTarjeta = new URLSearchParams({ vista: "embudo" });
  if (q?.trim()) qsTarjeta.set("q", q.trim());
  for (const f of filtrosDePacks(filtros)) qsTarjeta.append("filtro", f);
  if (orden && orden !== "alta") qsTarjeta.set("orden", orden);
  const paginas = await Promise.all(
    filtro.options.map((o) =>
      apiFetch<LeadsResponse>(
        `/admin/leads?${consultaDeColumna({ agente, q, filtros, orden, etapa, valor: o.value }).toString()}`,
      ),
    ),
  );
  return filtro.options.map((o, i) => {
    const pagina = paginas[i];
    return {
      value: o.value,
      label: o.label,
      total: faceta?.counts[o.value] ?? (pagina.ok ? pagina.data.total : 0),
      suma: faceta?.sumas ? (faceta.sumas[o.value] ?? 0) : null,
      tarjetas: pagina.ok ? pagina.data.items.map((fila) => tarjetaDeFila(fila, agente, qsTarjeta)) : [],
      entraron: [],
      hayMas: pagina.ok && pagina.data.has_more,
      error: pagina.ok ? undefined : `No se pudo cargar la etapa: ${pagina.error}`,
    };
  });
}
