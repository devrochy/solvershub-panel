import Link from "next/link";

import { ESCALATION_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type { EscalationPage } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Escalaciones" };

type EscalationRow = EscalationPage["items"][number];

export default async function EscalationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const res = await apiFetch<EscalationPage>(
    `/admin/escalations${sp.page ? `?page=${sp.page}` : ""}`,
  );
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar las escalaciones: {res.error}
      </p>
    );
  }
  const { items, page, has_more, total } = res.data;

  const columns: Column<EscalationRow>[] = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (esc) => esc.customer_name ?? esc.external_id ?? "Cliente",
    },
    {
      key: "motivo",
      header: "Motivo",
      cell: (esc) => <Badge variant="neutral">{esc.reason}</Badge>,
    },
    {
      key: "resumen",
      header: "Resumen",
      cell: (esc) => (
        <span className="block max-w-md truncate text-body">{esc.summary || "—"}</span>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (esc) => <StatusBadge value={esc.status} map={ESCALATION_STATUS} />,
    },
    {
      key: "fecha",
      header: "Fecha",
      cell: (esc) => <span className="text-body">{formatDateTime(esc.created_at)}</span>,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (esc) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`/conversaciones/${esc.conversation_id}`}>Ver</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Escalaciones"
        description="Conversaciones que el agente derivó a una persona."
        helpSection="escalations"
        />

      <DataTable
        columns={columns}
        rows={items}
        getRowKey={(esc, index) => `${esc.conversation_id}-${index}`}
        emptyTitle="No hay escalaciones"
        emptyDescription="Cuando el agente derive una conversación, aparecerá aquí."
      />

      <Pagination
        page={page}
        hasMore={has_more}
        total={total}
        label="escalaciones"
        makeHref={(target) => `/escalaciones?page=${target}`}
      />
    </div>
  );
}
