import Link from "next/link";
import { Send } from "lucide-react";

import { AgenteSwitch } from "@/components/domain/cliente/agente-switch";
import { EnviarPlantilla } from "@/app/(app)/leads/_components/enviar-plantilla";
import { FichaCliente } from "@/components/domain/cliente/ficha-cliente";
import { LeadsFilters } from "@/app/(app)/leads/_components/leads-filters";
import { ListaDeClientes } from "@/app/(app)/leads/_components/lista-de-clientes";
import { ListPage } from "@/components/templates/list-page";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { BotonReintentar, EstadoDeError } from "@/components/ui/estado-de-error";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type { ConversationConnection, LeadAgent, LeadDetail, LeadsResponse, Me } from "@/lib/api/types";
import {
  consultaClientes,
  esPropietarioOPlataforma,
  etiquetaClasificacion,
  hrefFicha,
  puedeEditarClientes,
  telefonoVisible,
  type FiltrosClientes,
  ubicacionVisible,
} from "@/lib/clientes";
import { canalLabel } from "@/lib/labels";

export const metadata = { title: "Clientes" };

type LeadRow = LeadsResponse["items"][number];

const TONO_CLASIFICACION: Record<string, "neutral" | "info" | "accent" | "success" | "warning" | "danger"> = {
  nuevo: "info",
  prospecto: "neutral",
  cliente: "success",
  vip: "accent",
  inactivo: "warning",
  bloqueado: "danger",
};

/** HU-CRM-12 (ADR-0179): solo los agentes con datos reales de este cliente; General siempre (ADR-0153). */
function nombresDeAgentes(lead: LeadRow, agentes: LeadAgent[]): string {
  return agentes
    .filter((agente) => agente.key === "general" || lead.agentes.includes(agente.key))
    .map((agente) => agente.name)
    .join(" · ");
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<FiltrosClientes> }) {
  const sp = await searchParams;
  const qs = consultaClientes(sp);
  const csv = consultaClientes(sp, { conPagina: false });

  const [res, conexiones, ficha, me] = await Promise.all([
    apiFetch<LeadsResponse>(`/admin/leads${qs.size ? `?${qs.toString()}` : ""}`),
    apiFetch<ConversationConnection[]>("/admin/conversations/connections"),
    sp.cliente ? apiFetch<LeadDetail>(`/admin/leads/${encodeURIComponent(sp.cliente)}`) : null,
    apiFetch<Me>("/admin/me"),
  ]);
  // HU-CRM-06 (D-SPEC-33-8): el envío a un segmento es solo del propietario o la plataforma.
  const puedeEnviar =
    me.ok && (me.data.role === "master" || me.data.role === "tester" || me.data.tenant?.role === "owner");

  const header = {
    title: "Clientes",
    description:
      "Las personas que el agente ha atendido. Abre una para ver lo que sabemos de ella, corregirlo o pausar el agente solo para ese cliente.",
    helpSection: "leads",
    densidad: "compacta" as const,
    actions: (
      <Button asChild variant="outline">
        <a href={`/api/leads/export${csv.size ? `?${csv.toString()}` : ""}`} download>
          Exportar CSV
        </a>
      </Button>
    ),
  };

  if (!res.ok) {
    return (
      <ListPage header={header}>
        <div className="rounded-lg border border-border-soft bg-surface">
          <EstadoDeError
            titulo="No pudimos cargar los clientes"
            descripcion="Revisa tu conexión y vuelve a intentarlo. Si sigue pasando, avísanos."
            detalle={res.error}
            accion={<BotonReintentar />}
          />
        </div>
      </ListPage>
    );
  }

  const { items, filters, agents, page, has_more, total } = res.data;
  const hayFiltros = csv.size > 0;
  // Con `getRowHref` el enlace cubre la fila: lo que se opera dentro va por encima de él.
  const sobreLaFila = "relative z-10";

  const tableColumns: Column<LeadRow>[] = [
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
    {
      key: "contacto",
      header: "Contacto",
      cell: (lead) => (
        <div className="flex flex-col whitespace-nowrap">
          <span className="tabular-nums text-body">{telefonoVisible(lead.perfil)}</span>
          <span className="text-xs text-text-soft">{canalLabel(lead.canal)}</span>
        </div>
      ),
    },
    {
      key: "clasificacion",
      header: "Clasificación",
      cell: (lead) => {
        const etiqueta = etiquetaClasificacion(lead.perfil.clasificacion, lead.perfil.clasificacion_label);
        const segmentoVentas = lead.extras["clasificacion"];
        return (
          <div className="flex flex-col items-start gap-1">
            <Badge variant={TONO_CLASIFICACION[lead.perfil.clasificacion ?? ""] ?? "neutral"} className="whitespace-nowrap">
              {etiqueta}
            </Badge>
            {segmentoVentas != null && segmentoVentas !== "" && (
              <span className="text-xs text-text-soft">Ventas: {String(segmentoVentas)}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "agentes",
      header: "Agentes",
      cell: (lead) => <span className="text-body">{nombresDeAgentes(lead, agents)}</span>,
    },
    {
      key: "agente",
      header: "Agente",
      info: "Activo: el agente responde a este cliente. Pausado: el agente no le responde.",
      cell: (lead) => (
        <div className={`${sobreLaFila} flex w-fit items-center gap-2`}>
          <AgenteSwitch
            leadId={lead.id}
            botPaused={lead.bot_paused ?? false}
            nombre={lead.perfil.nombre_visible}
          />
          <span className="text-body">{lead.bot_paused ? "Pausado" : "Activo"}</span>
        </div>
      ),
    },
    {
      key: "ubicacion",
      header: "Ubicación",
      className: "max-xl:hidden",
      cell: (lead) => <span className="text-body">{ubicacionVisible(lead.perfil)}</span>,
    },
    ...(puedeEnviar
      ? [
          {
            key: "enviar",
            header: <span className="sr-only">Enviar plantilla</span>,
            align: "right",
            className: "w-10",
            cell: (lead) =>
              lead.agentes.includes("ventas") ? (
                <div className={`${sobreLaFila} w-fit`}>
                  <EnviarPlantilla
                    consulta=""
                    cliente={{ id: lead.id, nombre: lead.perfil.nombre_visible }}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Enviar plantilla a ${lead.perfil.nombre_visible}`}
                        title="Enviar plantilla"
                      >
                        <Send className="h-4 w-4" aria-hidden />
                      </Button>
                    }
                  />
                </div>
              ) : null,
          } satisfies Column<LeadRow>,
        ]
      : []),
  ];

  return (
    <ListPage
      header={header}
      filters={
        <LeadsFilters sp={sp} connections={conexiones.ok ? conexiones.data : []} filters={filters ?? []} total={total} />
      }
    >
      {ficha && !ficha.ok && (
        <EstadoDeError
          forma="en-linea"
          titulo="No pudimos abrir la ficha"
          descripcion="Vuelve a intentarlo o elige otro cliente de la lista."
          detalle={ficha.error}
          accion={<BotonReintentar />}
        />
      )}

      {items.length > 0 && <ListaDeClientes clientes={items} qs={qs} puedeEnviar={puedeEnviar} />}

      <DataTable
        className={items.length > 0 ? "max-md:hidden" : undefined}
        columns={tableColumns}
        rows={items}
        getRowKey={(lead) => lead.id}
        emptyTitle={hayFiltros ? "No hay clientes con estos filtros" : "Sin clientes todavía"}
        emptyDescription={
          hayFiltros
            ? "Prueba con otra búsqueda o quita los filtros."
            : "Cuando el agente atienda al primer cliente, aparecerá aquí."
        }
        emptyAction={
          hayFiltros ? (
            <Button asChild variant="outline">
              <Link href="/leads">Limpiar filtros</Link>
            </Button>
          ) : undefined
        }
        caption="Clientes"
        serverPaginated
        getRowHref={(lead) => hrefFicha(lead.id, { qs })}
        getRowLabel={(lead) => `Abrir la ficha de ${lead.perfil.nombre_visible}`}
      />

      <Pagination
        page={page}
        hasMore={has_more}
        total={total}
        label="clientes"
        makeHref={(target) => {
          const next = new URLSearchParams(qs);
          next.set("page", String(target));
          return `/leads?${next.toString()}`;
        }}
      />

      {ficha?.ok && (
        <FichaCliente
          key={`${ficha.data.id}-${sp.agente ?? "general"}-${sp.editar ?? ""}`}
          detalle={ficha.data}
          closeHref={hrefFicha(undefined, { qs })}
          agenteInicial={sp.agente}
          editarInicial={sp.editar === "1"}
          hrefBase={hrefFicha(undefined, { qs })}
          puedeEditar={me.ok ? puedeEditarClientes(me.data) : false}
          esPropietario={me.ok ? esPropietarioOPlataforma(me.data) : false}
        />
      )}
    </ListPage>
  );
}
