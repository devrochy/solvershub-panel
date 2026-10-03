import Link from "next/link";

import { ConversationFilters } from "@/app/(app)/conversaciones/_components/conversation-filters";
import { BinaryBadge, CONVERSATION_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type { ConversationPage } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Conversaciones" };

type ConversationRow = ConversationPage["items"][number];

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.q) qs.set("q", sp.q);
  if (sp.status) qs.set("status", sp.status);
  if (sp.page) qs.set("page", sp.page);

  const res = await apiFetch<ConversationPage>(
    `/admin/conversations${qs.size ? `?${qs.toString()}` : ""}`,
  );
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar las conversaciones: {res.error}
      </p>
    );
  }
  const { items, page, has_more, total } = res.data;

  const columns: Column<ConversationRow>[] = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (conv) => conv.customer_name ?? conv.external_id ?? "Cliente",
    },
    {
      key: "canal",
      header: "Canal",
      cell: (conv) => <Badge variant="neutral">{conv.channel}</Badge>,
    },
    {
      key: "estado",
      header: "Estado",
      cell: (conv) => <StatusBadge value={conv.status} map={CONVERSATION_STATUS} />,
    },
    {
      key: "agente",
      header: "Agente",
      cell: (conv) => (
        <BinaryBadge
          active={!conv.bot_paused}
          activeLabel="Activo"
          inactiveLabel="Pausado"
          tone="success"
        />
      ),
    },
    {
      key: "inicio",
      header: "Inicio",
      cell: (conv) => <span className="text-body">{formatDateTime(conv.started_at)}</span>,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (conv) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`/conversaciones/${conv.id}`}>Ver</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Conversaciones" description="Atenciones del agente con cada cliente."   helpSection="conversations"
        />

      <ConversationFilters q={sp.q} status={sp.status} />

      <DataTable
        columns={columns}
        rows={items}
        getRowKey={(conv) => conv.id}
        emptyTitle="Sin conversaciones todavía"
        emptyDescription="Aparecerán aquí en cuanto el agente atienda mensajes."
      />

      <Pagination
        page={page}
        hasMore={has_more}
        total={total}
        label="conversaciones"
        makeHref={(target) => {
          const next = new URLSearchParams(qs);
          next.set("page", String(target));
          return `/conversaciones?${next.toString()}`;
        }}
      />
    </div>
  );
}
