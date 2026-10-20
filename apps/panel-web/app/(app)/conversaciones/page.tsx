import { Bandeja } from "@/app/(app)/conversaciones/_components/bandeja";
import { ConversationFilters } from "@/app/(app)/conversaciones/_components/conversation-filters";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type { ConversationConnection, ConversationDetail, ConversationPage } from "@/lib/api/types";

export const metadata = { title: "Conversaciones" };

type Filtros = { q?: string; status?: string; connection_id?: string; page?: string; c?: string };

export default async function ConversationsPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.q) qs.set("q", sp.q);
  if (sp.status) qs.set("status", sp.status);
  if (sp.connection_id) qs.set("connection_id", sp.connection_id);
  if (sp.page) qs.set("page", sp.page);

  const [res, conexiones, detalle] = await Promise.all([
    apiFetch<ConversationPage>(`/admin/conversations${qs.size ? `?${qs.toString()}` : ""}`),
    apiFetch<ConversationConnection[]>("/admin/conversations/connections"),
    sp.c ? apiFetch<ConversationDetail>(`/admin/conversations/${encodeURIComponent(sp.c)}`) : null,
  ]);
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar las conversaciones: {res.error}
      </p>
    );
  }
  const { items, page, has_more, total } = res.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Conversaciones"
        description="Atiende a tus clientes en vivo: los mensajes llegan solos."
        helpSection="conversations"
      />

      {/* En el celular, con un chat abierto, los filtros quedan en la lista («Volver»). */}
      <div className={sp.c ? "hidden lg:block" : undefined}>
        <ConversationFilters
          q={sp.q}
          status={sp.status}
          connectionId={sp.connection_id}
          connections={conexiones.ok ? conexiones.data : []}
        />
      </div>

      {detalle && !detalle.ok && (
        <p role="alert" className="text-sm text-status-danger-fg">
          {detalle.status === 404
            ? "Esa conversación no existe o es de otro negocio."
            : `No se pudo abrir la conversación: ${detalle.error}`}
        </p>
      )}

      <Bandeja chats={items} query={qs.toString()} detalle={detalle?.ok ? detalle.data : null} />

      {(page > 1 || has_more) && (
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
      )}
    </div>
  );
}
