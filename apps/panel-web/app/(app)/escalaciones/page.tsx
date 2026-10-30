import Link from "next/link";

import { EscalacionFilters, MotivoBadge, ResumenEscalacion } from "@/components/domain/escalacion";
import { ESCALATION_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { ListPage } from "@/components/templates/list-page";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type { EscalationPage, Me } from "@/lib/api/types";
import { hrefFicha, puedeVerClientes } from "@/lib/clientes";
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
  const [res, me] = await Promise.all([
    apiFetch<EscalationPage>(`/admin/escalations${qs.size ? `?${qs.toString()}` : ""}`),
    apiFetch<Me>("/admin/me"),
  ]);
  // HU-CRM-20: el nombre abre la ficha solo si la sesión ve Clientes; si no, es texto.
  const puedeAbrirFicha = me.ok && puedeVerClientes(me.data);
  const { items, page, has_more, total } = res.ok
    ? res.data
    : { items: [], page: 1, has_more: false, total: 0 };

  const columns: Column<EscalationRow>[] = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (esc) => {
        const nombre = esc.customer_name ?? esc.external_id ?? "Cliente";
        return puedeAbrirFicha ? (
          <Link href={hrefFicha(esc.customer_id)} className="text-link hover:underline">
            {nombre}
          </Link>
        ) : (
          nombre
        );
      },
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
          <Link href={`/conversaciones?c=${esc.conversation_id}`}>Ver</Link>
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
