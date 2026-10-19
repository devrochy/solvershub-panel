import Link from "next/link";

import { EscalacionFilters, MotivoBadge, ResumenEscalacion } from "@/components/domain/escalacion";
import { ESCALATION_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { ListPage } from "@/components/templates/list-page";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type { EscalationPage } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Escalaciones" };

type EscalationRow = EscalationPage["items"][number];

export default async function EscalationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; reason_code?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.reason_code) qs.set("reason_code", sp.reason_code);
  if (sp.page) qs.set("page", sp.page);
  const res = await apiFetch<EscalationPage>(
    `/admin/escalations${qs.size ? `?${qs.toString()}` : ""}`,
  );
  const { items, page, has_more, total } = res.ok
    ? res.data
    : { items: [], page: 1, has_more: false, total: 0 };

  const columns: Column<EscalationRow>[] = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (esc) => esc.customer_name ?? esc.external_id ?? "Cliente",
    },
    {
      key: "motivo",
      header: "Motivo",
      cell: (esc) => <MotivoBadge esc={esc} />,
    },
    {
      key: "resumen",
      header: "Resumen",
      cell: (esc) => <ResumenEscalacion esc={esc} />,
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
    <ListPage
      header={{
        title: "Escalaciones",
        description: "Conversaciones que el agente derivó a una persona.",
        helpSection: "escalations",
      }}
      filters={<EscalacionFilters motivo={sp.reason_code} />}
    >
      <DataTable
        columns={columns}
        rows={items}
        getRowKey={(esc, index) => `${esc.conversation_id}-${index}`}
        emptyTitle={sp.reason_code ? "No hay escalaciones con este motivo" : "No hay escalaciones"}
        emptyDescription={
          sp.reason_code
            ? "Prueba con otro motivo o quita el filtro."
            : "Cuando el agente derive una conversación, aparecerá aquí."
        }
        error={res.ok ? null : `No se pudieron cargar las escalaciones: ${res.error}`}
        caption="Escalaciones"
        serverPaginated
      />

      {res.ok && (
        <Pagination
          page={page}
          hasMore={has_more}
          total={total}
          label="escalaciones"
          makeHref={(target) => {
            const destino = new URLSearchParams(qs);
            destino.set("page", String(target));
            return `/escalaciones?${destino.toString()}`;
          }}
        />
      )}
    </ListPage>
  );
}
