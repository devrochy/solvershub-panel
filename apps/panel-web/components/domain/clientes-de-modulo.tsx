import Link from "next/link";
import { Eye, MessageCircle, Phone, X } from "lucide-react";

import { EnviarPlantilla } from "@/app/(app)/leads/_components/enviar-plantilla";
import { ListPage } from "@/components/templates/list-page";
import { EtapaMenu } from "@/components/domain/cliente/etapa-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field } from "@/components/ui/field";
import { IconAction } from "@/components/ui/icon-action";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { TabLinks } from "@/components/ui/tab-links";
import { apiFetch } from "@/lib/api/server";
import type { LeadFilter, LeadsResponse, Me } from "@/lib/api/types";
import {
  enlaceTelefono,
  enlaceWhatsApp,
  filtrosCon,
  filtrosDePacks,
  hrefFicha,
  MAX_FILAS_CSV,
  ordenValido,
  ORDENES_CLIENTES,
  pestanasDeFaceta,
  puedeEditarClientes,
  puedeEnviarPlantilla,
  TONO_DE_ETAPA,
  telefonoVisible,
  textoDeActividad,
  valorDeFiltro,
} from "@/lib/clientes";
import { formatCellValue, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type Fila = LeadsResponse["items"][number];

export type FiltrosClientesDeModulo = { q?: string; page?: string; filtro?: string | string[]; orden?: string };

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
};

/** Query de `/admin/leads` para la lista de un módulo: el agente, la búsqueda y la página (y, si es operable, filtros, orden y contadores). */
export function consultaClientesDeModulo(
  agente: string,
  sp: FiltrosClientesDeModulo,
  operable?: OperableDeModulo,
): URLSearchParams {
  const qs = new URLSearchParams({ agente });
  if (sp.q?.trim()) qs.set("q", sp.q.trim());
  if (operable) {
    for (const f of filtrosDePacks(sp.filtro)) qs.append("filtro", f);
    const orden = ordenValido(sp.orden);
    if (orden && orden !== "alta") qs.set("orden", orden);
    if (operable.etapa) qs.set("facetas", operable.etapa);
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
}: {
  /** Clave del agente en `agents[].key` (`ventas`, `agenda`…). */
  agente: string;
  /** Ruta de esta página, para la paginación y la búsqueda. */
  basePath: string;
  titulo: string;
  descripcion: string;
  sp: FiltrosClientesDeModulo;
  helpSection?: string;
  vacioDescripcion: string;
  operable?: OperableDeModulo;
}) {
  const qs = consultaClientesDeModulo(agente, sp, operable);
  const [res, me] = await Promise.all([
    apiFetch<LeadsResponse>(`/admin/leads?${qs.toString()}`),
    operable ? apiFetch<Me>("/admin/me") : null,
  ]);
  const { items, agents, page, has_more, total, filters, facetas } = res.ok
    ? res.data
    : { items: [] as Fila[], agents: [], page: 1, has_more: false, total: 0, filters: [] as LeadFilter[], facetas: [] };
  const columnasDelAgente = agents.find((a) => a.key === agente)?.columns ?? [];
  const puedeEnviar = me?.ok ? puedeEnviarPlantilla(me.data) : false;
  const puedeCambiarEtapa = Boolean(operable?.pluginDeEtapa) && (me?.ok ? puedeEditarClientes(me.data) : false);

  // — Etapas (pestañas) y filtros declarados por el pack —
  const filtroDeEtapa = operable?.etapa ? filters?.find((f) => f.key === operable.etapa) : undefined;
  const faceta = operable?.etapa ? facetas?.find((f) => f.key === operable.etapa) : undefined;
  // Sin contadores (backend viejo) la etapa degrada a un select como los demás filtros.
  const etapaComoPestanas = Boolean(filtroDeEtapa && faceta);
  const filtrosEnSelect = (filters ?? []).filter(
    (f) => operable?.filtros?.includes(f.key) || (f.key === operable?.etapa && !etapaComoPestanas),
  );
  const etapaActual = operable?.etapa ? valorDeFiltro(sp.filtro, operable.etapa) : "";

  const hrefCon = (cambios: { q?: string | null; filtro?: string[]; orden?: string | null }) => {
    const next = new URLSearchParams();
    const q = cambios.q === undefined ? sp.q?.trim() : cambios.q;
    if (q) next.set("q", q);
    for (const f of cambios.filtro ?? filtrosDePacks(sp.filtro)) next.append("filtro", f);
    const orden = cambios.orden === undefined ? ordenValido(sp.orden) : cambios.orden;
    if (orden && orden !== "alta") next.set("orden", orden);
    return `${basePath}${next.size ? `?${next.toString()}` : ""}`;
  };

  type Chip = { clave: string; texto: string; quitarLabel: string; href: string };
  const chips: Chip[] = [];
  if (operable) {
    if (sp.q?.trim()) {
      chips.push({ clave: "q", texto: `Búsqueda: ${sp.q.trim()}`, quitarLabel: "Quitar la búsqueda", href: hrefCon({ q: null }) });
    }
    for (const f of filters ?? []) {
      const valor = valorDeFiltro(sp.filtro, f.key);
      if (!valor) continue;
      const opcion = f.options.find((o) => o.value === valor)?.label ?? valor;
      chips.push({
        clave: f.key,
        texto: `${f.label}: ${opcion}`,
        quitarLabel: `Quitar el filtro ${f.label}: ${opcion}`,
        href: hrefCon({ filtro: filtrosCon(sp.filtro, f.key, "") }),
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
          grande={grande}
        />
      );
    }
    return etapa ? (
      <Badge variant={TONO_DE_ETAPA[etapa.codigo] ?? "neutral"}>{etapa.texto}</Badge>
    ) : (
      <span className="text-xs text-text-soft">Sin lead de venta</span>
    );
  };

  const accionesDeFila = (lead: Fila, grande = false) => {
    const nombre = lead.perfil.nombre_visible;
    const tel = enlaceTelefono(lead.perfil);
    const wa = enlaceWhatsApp(lead.perfil);
    const tamano = grande ? "h-11 w-11" : "h-9 w-9";
    return (
      <div className="flex items-center justify-end gap-1">
        {wa && (
          <Button asChild variant="ghost" size="icon" className={tamano}>
            <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`Escribir por WhatsApp a ${nombre}`} title="WhatsApp">
              <MessageCircle className="h-4 w-4" aria-hidden />
            </a>
          </Button>
        )}
        {tel && (
          <Button asChild variant="ghost" size="icon" className={tamano}>
            <a href={tel} aria-label={`Llamar a ${nombre}`} title="Llamar">
              <Phone className="h-4 w-4" aria-hidden />
            </a>
          </Button>
        )}
        {puedeEnviar && (
          <EnviarPlantilla
            consulta=""
            cliente={{ id: lead.id, nombre }}
            icono={{ className: tamano }}
          />
        )}
        {grande ? (
          <Button asChild variant="ghost" size="icon" className={cn(tamano, "text-link")}>
            <Link href={hrefFicha(lead.id, { agente })} aria-label={`Ver la ficha de ${nombre}`} title="Ver la ficha">
              <Eye className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        ) : (
          <IconAction href={hrefFicha(lead.id, { agente })} label={`Ver la ficha de ${nombre}`} tone="ver">
            <Eye className="h-4 w-4" aria-hidden />
          </IconAction>
        )}
      </div>
    );
  };

  const columns: Column<Fila>[] = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (lead) => (
        <Link href={hrefFicha(lead.id, { agente })} className="truncate font-medium text-link hover:underline">
          {lead.perfil.nombre_visible}
        </Link>
      ),
    },
    ...(operable?.etapa
      ? [{ key: "etapa", header: "Etapa", cell: (lead) => badgeDeEtapa(lead) } satisfies Column<Fila>]
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
    ...columnasDelAgente
      .filter((columna) => columna.key !== operable?.etapa)
      .map(
        (columna): Column<Fila> => ({
          key: `extra-${columna.key}`,
          header: columna.label,
          cell: (lead) => <span className="text-body">{formatCellValue(lead.extras[columna.key])}</span>,
        }),
      ),
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: operable
        ? (lead) => accionesDeFila(lead)
        : (lead) => (
            <div className="flex items-center justify-end gap-1">
              <IconAction href={hrefFicha(lead.id, { agente })} label={`Ver la ficha de ${lead.perfil.nombre_visible}`} tone="ver">
                <Eye className="h-4 w-4" aria-hidden />
              </IconAction>
            </div>
          ),
    },
  ];

  const csv = new URLSearchParams({ agente });
  if (operable) {
    if (sp.q?.trim()) csv.set("q", sp.q.trim());
    for (const f of filtrosDePacks(sp.filtro)) csv.append("filtro", f);
  }
  const csvTruncado = Boolean(operable) && res.ok && total > MAX_FILAS_CSV;

  const filtrosForm = (
    <form method="get" action={basePath} className="flex flex-wrap items-end gap-3">
      {/* La etapa elegida en las pestañas no es un campo del formulario: se conserva al filtrar. */}
      {etapaComoPestanas && etapaActual && operable?.etapa && (
        <input type="hidden" name="filtro" value={`${operable.etapa}:${etapaActual}`} />
      )}
      <Field label="Buscar" htmlFor="q" className="w-60">
        <Input id="q" name="q" type="search" defaultValue={sp.q ?? ""} placeholder="Nombre, identificador o teléfono" />
      </Field>
      {operable &&
        filtrosEnSelect.map((f) => {
          const valor = valorDeFiltro(sp.filtro, f.key);
          return (
            <Field key={f.key} label={f.label} htmlFor={`filtro-${f.key}`} className="w-44">
              <Select id={`filtro-${f.key}`} name="filtro" defaultValue={valor ? `${f.key}:${valor}` : ""}>
                <option value="">Todos</option>
                {f.options.map((o) => (
                  <option key={o.value} value={`${f.key}:${o.value}`}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          );
        })}
      {operable && (
        <Field label="Ordenar por" htmlFor="orden" className="w-48">
          <Select id="orden" name="orden" defaultValue={ordenValido(sp.orden) ?? "alta"}>
            {ORDENES_CLIENTES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Button type="submit" variant="outline">
        Filtrar
      </Button>
      {hayFiltros && (
        <Link href={basePath} className="pb-2.5 text-sm text-link hover:underline">
          {operable ? "Limpiar todo" : "Limpiar"}
        </Link>
      )}
    </form>
  );

  const hayFilas = res.ok && items.length > 0;
  const tabla = (
    <DataTable
      columns={columns}
      rows={items}
      getRowKey={(lead) => lead.id}
      emptyTitle={operable && hayFiltros ? "Ningún cliente coincide" : "Sin clientes todavía"}
      emptyDescription={
        operable && hayFiltros ? "Prueba con otra etapa o quita algún filtro para ver más clientes." : vacioDescripcion
      }
      emptyAction={
        operable && hayFiltros ? (
          <Button asChild variant="outline" size="sm">
            <Link href={basePath}>Limpiar filtros</Link>
          </Button>
        ) : undefined
      }
      error={res.ok ? null : `No se pudieron cargar los clientes: ${res.error}`}
      errorAction={
        operable ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefCon({})}>Reintentar</Link>
          </Button>
        ) : undefined
      }
      caption={titulo}
      serverPaginated
    />
  );

  return (
    <ListPage
      header={{
        title: titulo,
        description: descripcion,
        helpSection,
        actions: operable ? (
          <Button asChild variant="outline">
            <a href={`/api/leads/export?${csv.toString()}`} download>
              Exportar CSV
            </a>
          </Button>
        ) : undefined,
      }}
      filters={filtrosForm}
    >
      {operable && etapaComoPestanas && filtroDeEtapa && (
        <EtapasConContador
          filtro={filtroDeEtapa}
          faceta={faceta}
          etapaActual={etapaActual}
          hrefDeEtapa={(valor) => hrefCon({ filtro: filtrosCon(sp.filtro, filtroDeEtapa.key, valor) })}
        />
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

      {operable && hayFilas ? (
        <>
          <div className="hidden md:block">{tabla}</div>
          <ul className="flex flex-col gap-3 md:hidden" aria-label={titulo}>
            {items.map((lead) => (
              <li key={lead.id} className="flex flex-col gap-2 rounded-lg border border-border-soft bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={hrefFicha(lead.id, { agente })}
                    className="inline-flex min-h-11 min-w-0 items-center font-medium text-link hover:underline"
                  >
                    {lead.perfil.nombre_visible}
                  </Link>
                  {operable.etapa && badgeDeEtapa(lead, true)}
                </div>
                <p className="text-sm text-body">{telefonoVisible(lead.perfil)}</p>
                <p className="text-xs text-text-soft">Última actividad: {textoDeActividad(lead.ultima_actividad)}</p>
                {accionesDeFila(lead, true)}
              </li>
            ))}
          </ul>
        </>
      ) : (
        tabla
      )}

      {res.ok && (
        <Pagination
          page={page}
          hasMore={has_more}
          total={total}
          label="clientes"
          makeHref={(target) => {
            const next = new URLSearchParams(qs);
            next.delete("agente");
            next.delete("facetas");
            next.set("page", String(target));
            return `${basePath}?${next.toString()}`;
          }}
        />
      )}
    </ListPage>
  );
}

/** Pestañas «Todas · Nuevo · Calificado…» con cuántos clientes hay en cada etapa y los que aún no tienen lead. */
function EtapasConContador({
  filtro,
  faceta,
  etapaActual,
  hrefDeEtapa,
}: {
  filtro: LeadFilter;
  faceta: NonNullable<LeadsResponse["facetas"]>[number] | undefined;
  etapaActual: string;
  hrefDeEtapa: (valor: string) => string;
}) {
  const { pestanas, sinValor } = pestanasDeFaceta(filtro, faceta);
  const items = pestanas.map((p) => ({ href: hrefDeEtapa(p.value), label: p.label, count: p.count }));
  const actual = items[Math.max(0, pestanas.findIndex((p) => p.value === etapaActual))].href;
  return (
    <div className="flex flex-col gap-1">
      <TabLinks label={`Clientes por ${filtro.label.toLowerCase()}`} items={items} current={actual} />
      {sinValor > 0 && (
        <p className="text-xs text-text-soft">
          {formatNumber(sinValor)} {sinValor === 1 ? "cliente aún no tiene" : "clientes aún no tienen"} lead de venta y no
          aparecen en ninguna etapa.
        </p>
      )}
    </div>
  );
}
