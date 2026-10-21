import Link from "next/link";

import { AgenteSwitch } from "@/app/(app)/leads/_components/agente-switch";
import { EnviarPlantilla } from "@/app/(app)/leads/_components/enviar-plantilla";
import { FichaCliente } from "@/app/(app)/leads/_components/ficha-cliente";
import { LeadsFilters } from "@/app/(app)/leads/_components/leads-filters";
import { PromocionDelSegmento } from "@/app/(app)/leads/_components/promocion-del-segmento";
import { ListPage } from "@/components/templates/list-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type { ConversationConnection, LeadDetail, LeadsResponse, Me } from "@/lib/api/types";
import { consultaClientes, segmentoDelFiltro, type FiltrosClientes } from "@/lib/clientes";
import { formatCellValue } from "@/lib/format";
import { canalLabel } from "@/lib/labels";

export const metadata = { title: "Clientes" };

type LeadRow = LeadsResponse["items"][number];

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
  const { items, columns, filters, page, has_more, total } = res.ok
    ? res.data
    : { items: [], columns: [], filters: [], page: 1, has_more: false, total: 0 };

  // HU-CRM-06: la promoción por segmento solo existe si pack_commerce aporta el filtro de clasificación.
  const conClasificacion = (filters ?? []).some((f) => f.key === "clasificacion");
  const segmento = segmentoDelFiltro(sp.filtro, filters ?? []);

  const hrefFicha = (id?: string) => {
    const next = new URLSearchParams(qs);
    if (id) next.set("cliente", id);
    return `/leads${next.size ? `?${next.toString()}` : ""}`;
  };

  const tableColumns: Column<LeadRow>[] = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (lead) => (
        <Link href={hrefFicha(lead.id)} scroll={false} className="font-medium text-link hover:underline">
          {lead.cliente}
        </Link>
      ),
    },
    {
      key: "canal",
      header: "Canal",
      cell: (lead) => <Badge variant="neutral">{canalLabel(lead.canal)}</Badge>,
    },
    { key: "telefono", header: "Teléfono", cell: (lead) => <span className="text-body">{lead.telefono ?? "—"}</span> },
    ...columns.map((column) => ({
      key: column.key,
      header: column.label,
      cell: (lead: LeadRow) => <span className="text-body">{formatCellValue(lead.extras[column.key])}</span>,
    })),
    { key: "alta", header: "Alta", cell: (lead) => <span className="text-body">{lead.alta}</span> },
    {
      key: "agente",
      header: "Agente",
      cell: (lead) => <AgenteSwitch leadId={lead.id} botPaused={lead.bot_paused ?? false} nombre={lead.cliente} />,
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
            {puedeEnviar && <EnviarPlantilla consulta={csv.toString()} />}
            {conClasificacion && <PromocionDelSegmento segmento={segmento} total={total} />}
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

      {ficha?.ok && <FichaCliente key={ficha.data.id} detalle={ficha.data} closeHref={hrefFicha()} />}
      {ficha && !ficha.ok && (
        <p role="alert" className="text-sm text-status-danger-fg">
          No se pudo abrir la ficha: {ficha.error}
        </p>
      )}
    </ListPage>
  );
}
