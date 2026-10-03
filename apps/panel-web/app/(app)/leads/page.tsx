import { LeadsFilters } from "@/app/(app)/leads/_components/leads-filters";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type { LeadsResponse } from "@/lib/api/types";
import { formatCellValue } from "@/lib/format";

export const metadata = { title: "Leads" };

type LeadRow = LeadsResponse["items"][number];

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.q) qs.set("q", sp.q);
  if (sp.page) qs.set("page", sp.page);

  const res = await apiFetch<LeadsResponse>(`/admin/leads${qs.size ? `?${qs.toString()}` : ""}`);
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar los leads: {res.error}
      </p>
    );
  }
  const { items, columns, page, has_more, total } = res.data;

  const tableColumns: Column<LeadRow>[] = [
    { key: "cliente", header: "Cliente", cell: (lead) => lead.cliente },
    {
      key: "canal",
      header: "Canal",
      cell: (lead) => <Badge variant="neutral">{lead.canal}</Badge>,
    },
    { key: "alta", header: "Alta", cell: (lead) => <span className="text-body">{lead.alta}</span> },
    ...columns.map((column) => ({
      key: column.key,
      header: column.label,
      cell: (lead: LeadRow) => (
        <span className="text-body">{formatCellValue(lead.extras[column.key])}</span>
      ),
    })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leads"
        description="Clientes que el agente ha atendido. Las columnas de cada habilidad se suman aquí."
        helpSection="leads"
        />

      <LeadsFilters q={sp.q} />

      <DataTable
        columns={tableColumns}
        rows={items}
        getRowKey={(lead) => lead.id}
        emptyTitle="Sin leads todavía"
        emptyDescription="Cuando el agente atienda al primer cliente, aparecerá aquí."
      />

      <Pagination
        page={page}
        hasMore={has_more}
        total={total}
        label="leads"
        makeHref={(target) => {
          const next = new URLSearchParams(qs);
          next.set("page", String(target));
          return `/leads?${next.toString()}`;
        }}
      />
    </div>
  );
}
