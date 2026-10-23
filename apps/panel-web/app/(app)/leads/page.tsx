import Link from "next/link";
import { Eye, Pencil, Send } from "lucide-react";

import { AgenteSwitch } from "@/app/(app)/leads/_components/agente-switch";
import { EnviarPlantilla } from "@/app/(app)/leads/_components/enviar-plantilla";
import { FichaCliente } from "@/app/(app)/leads/_components/ficha-cliente";
import { LeadsFilters } from "@/app/(app)/leads/_components/leads-filters";
import { AgentIcon } from "@/components/domain/agent-icon";
import { ChannelIcon } from "@/components/domain/channel-icon";
import { ListPage } from "@/components/templates/list-page";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { IconAction } from "@/components/ui/icon-action";
import { Pagination } from "@/components/ui/pagination";
import { Tooltip } from "@/components/ui/tooltip";
import { apiFetch } from "@/lib/api/server";
import type { ConversationConnection, LeadAgent, LeadDetail, LeadsResponse, Me } from "@/lib/api/types";
import {
  consultaClientes,
  etiquetaClasificacion,
  telefonoVisible,
  ubicacionVisible,
  type FiltrosClientes,
} from "@/lib/clientes";
import { canalLabel } from "@/lib/labels";

export const metadata = { title: "Clientes" };

type LeadRow = LeadsResponse["items"][number];

const TONO_CLASIFICACION: Record<string, "neutral" | "accent" | "success" | "warning" | "danger"> = {
  prospecto: "neutral",
  cliente: "success",
  vip: "accent",
  inactivo: "warning",
  bloqueado: "danger",
};

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
  const { items, filters, agents, page, has_more, total } = res.ok
    ? res.data
    : { items: [], filters: [], agents: [], page: 1, has_more: false, total: 0 };

  const hrefFicha = (id?: string, agente?: string, editar = false) => {
    const next = new URLSearchParams(qs);
    if (id) next.set("cliente", id);
    else next.delete("cliente");
    if (id && agente) next.set("agente", agente);
    else next.delete("agente");
    if (id && editar) next.set("editar", "1");
    else next.delete("editar");
    return `/leads${next.size ? `?${next.toString()}` : ""}`;
  };

  const agentesDeLaFila = (lead: LeadRow, agentes: LeadAgent[]) => (
    <div className="flex items-center gap-1">
      {agentes.map((agente) => {
        const tiene = lead.agentes.includes(agente.key);
        const destino = agente.key === "general" ? hrefFicha(lead.id) : hrefFicha(lead.id, agente.key);
        return (
          <Tooltip key={agente.key} label={tiene ? agente.name : `${agente.name} · sin datos todavía`}>
            <Link
              href={destino}
              scroll={false}
              aria-label={`Abrir ${agente.name} de ${lead.perfil.nombre_visible}`}
              className="rounded-md p-0.5 transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <AgentIcon agentKey={agente.key} name={agente.name} muted={!tiene} />
            </Link>
          </Tooltip>
        );
      })}
    </div>
  );

  const tableColumns: Column<LeadRow>[] = [
    {
      key: "avatar",
      header: <span className="sr-only">Foto</span>,
      className: "w-10",
      cell: (lead) => <Avatar name={lead.perfil.nombre_visible} src={lead.perfil.avatar_url} size="sm" />,
    },
    {
      key: "cliente",
      header: "Cliente",
      cell: (lead) => (
        <div className="flex min-w-0 flex-col">
          <Link
            href={hrefFicha(lead.id)}
            scroll={false}
            className="truncate font-medium text-link hover:underline"
          >
            {lead.perfil.nombre_visible}
          </Link>
          {lead.perfil.alias && lead.perfil.alias !== lead.perfil.nombre_visible && (
            <span className="truncate text-xs text-text-soft">Alias: {lead.perfil.alias}</span>
          )}
        </div>
      ),
    },
    {
      key: "canal",
      header: "Canal",
      className: "w-14",
      cell: (lead) => (
        <span className="inline-flex items-center">
          <ChannelIcon id={lead.canal} size="sm" />
          <span className="sr-only">{canalLabel(lead.canal)}</span>
        </span>
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
            <Badge variant={TONO_CLASIFICACION[lead.perfil.clasificacion ?? ""] ?? "neutral"}>{etiqueta}</Badge>
            {segmentoVentas != null && segmentoVentas !== "" && (
              <span className="text-xs text-text-soft">Ventas: {String(segmentoVentas)}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "telefono",
      header: "Teléfono",
      cell: (lead) => <span className="text-body">{telefonoVisible(lead.perfil)}</span>,
    },
    {
      key: "ubicacion",
      header: "Ubicación",
      cell: (lead) => {
        const texto = ubicacionVisible(lead.perfil);
        return lead.perfil.mapa_url ? (
          <a
            href={lead.perfil.mapa_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link hover:underline"
            title="Abrir en el mapa"
          >
            {texto}
          </a>
        ) : (
          <span className="text-body">{texto}</span>
        );
      },
    },
    {
      key: "agentes",
      header: "Agentes",
      cell: (lead) => agentesDeLaFila(lead, agents),
    },
    {
      key: "bot",
      header: "Estado del bot",
      info: "Activo: el agente responde a este cliente. Desactivado: el agente no le responde.",
      cell: (lead) => {
        const activo = !(lead.bot_paused ?? false);
        return (
          <div className="flex items-center gap-2">
            <AgenteSwitch
              leadId={lead.id}
              botPaused={lead.bot_paused ?? false}
              nombre={lead.perfil.nombre_visible}
            />
            <span className={activo ? "text-status-success-fg" : "text-status-danger-fg"}>
              {activo ? "Activo" : "Desactivado"}
            </span>
          </div>
        );
      },
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (lead) => (
        <div className="flex items-center justify-end gap-1">
          {puedeEnviar && lead.agentes.includes("ventas") && (
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
          )}
          <IconAction href={hrefFicha(lead.id)} label="Ver ficha" tone="ver">
            <Eye className="h-4 w-4" aria-hidden />
          </IconAction>
          <IconAction href={hrefFicha(lead.id, "general", true)} label="Editar datos" tone="editar">
            <Pencil className="h-4 w-4" aria-hidden />
          </IconAction>
        </div>
      ),
    },
  ];

  return (
    <ListPage
      header={{
        title: "Clientes",
        description:
          "Las personas que el agente ha atendido. Abre una para ver lo que sabemos de ella, corregirlo o pausar el agente solo para ese cliente.",
        helpSection: "leads",
        actions: (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href={`/api/leads/export${csv.size ? `?${csv.toString()}` : ""}`} download>
                Exportar CSV
              </a>
            </Button>
          </div>
        ),
      }}
      filters={<LeadsFilters sp={sp} connections={conexiones.ok ? conexiones.data : []} filters={filters ?? []} />}
    >
      <DataTable
        columns={tableColumns}
        rows={items}
        getRowKey={(lead) => lead.id}
        emptyTitle="Sin clientes todavía"
        emptyDescription="Cuando el agente atienda al primer cliente, aparecerá aquí."
        error={res.ok ? null : `No se pudieron cargar los clientes: ${res.error}`}
        caption="Clientes"
        serverPaginated
      />

      {res.ok && (
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
      )}

      {ficha?.ok && (
        <FichaCliente
          key={`${ficha.data.id}-${sp.agente ?? "general"}-${sp.editar ?? ""}`}
          detalle={ficha.data}
          closeHref={hrefFicha()}
          agenteInicial={sp.agente}
          editarInicial={sp.editar === "1"}
          hrefBase={hrefFicha()}
        />
      )}
      {ficha && !ficha.ok && (
        <p role="alert" className="text-sm text-status-danger-fg">
          No se pudo abrir la ficha: {ficha.error}
        </p>
      )}
    </ListPage>
  );
}
