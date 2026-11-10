import { EscalacionFilters, MotivoBadge } from "@/components/domain/escalacion";
import { ESCALATION_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { ListPage } from "@/components/templates/list-page";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type { EscalationPage } from "@/lib/api/types";
import { nombreDelChat } from "@/lib/conversaciones/nombre";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Escalaciones" };

type EscalationRow = EscalationPage["items"][number];

export default async function EscalationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; reason_code?: string; estado?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.reason_code) qs.set("reason_code", sp.reason_code);
  if (sp.estado) qs.set("estado", sp.estado);
  if (sp.page) qs.set("page", sp.page);
  const res = await apiFetch<EscalationPage>(`/admin/escalations${qs.size ? `?${qs.toString()}` : ""}`);
  const { items, page, has_more, total } = res.ok
    ? res.data
    : { items: [], page: 1, has_more: false, total: 0 };

  const columns: Column<EscalationRow>[] = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (esc) => <span className="whitespace-nowrap font-medium">{nombreDelChat(esc)}</span>,
    },
    {
      key: "motivo",
      header: "Motivo",
      cell: (esc) => <MotivoBadge esc={esc} />,
    },
    {
      key: "resumen",
      header: "Resumen",
      // `w-full max-w-0`: toma solo el ancho que sobra, así el chevron nunca queda fuera de vista.
      className: "w-full max-w-0",
      cell: (esc) => (
        <span className="block min-w-48 truncate text-body" title={esc.summary ?? undefined}>
          {esc.summary || "—"}
        </span>
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
      cell: (esc) => <span className="whitespace-nowrap text-body tabular-nums">{formatDateTime(esc.created_at)}</span>,
    },
  ];

  return (
    <ListPage
      header={{
        title: "Conversaciones",
        description: "Conversaciones que el agente derivó a una persona.",
        helpSection: "escalations",
        densidad: "compacta",
        breadcrumbs: [{ label: "Operación" }, { label: "Conversaciones" }],
      }}
      filters={<EscalacionFilters motivo={sp.reason_code} estado={sp.estado} />}
    >
      <DataTable
        columns={columns}
        rows={items}
        getRowKey={(esc, index) => `${esc.conversation_id}-${index}`}
        emptyTitle={
          sp.reason_code || sp.estado ? "No hay escalaciones con estos filtros" : "No hay escalaciones"
        }
        emptyDescription={
          sp.reason_code || sp.estado
            ? "Prueba con otro filtro o quita los filtros."
            : "Cuando el agente derive una conversación, aparecerá aquí."
        }
        error={res.ok ? null : `No se pudieron cargar las escalaciones: ${res.error}`}
        caption="Escalaciones"
        serverPaginated
        getRowHref={(esc) => `/conversaciones?c=${esc.conversation_id}`}
        getRowLabel={(esc) => `Abrir el chat de ${nombreDelChat(esc)}`}
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
