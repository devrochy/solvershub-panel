import { Bandeja } from "@/app/(app)/conversaciones/_components/bandeja";
import { FichaCliente } from "@/components/domain/cliente/ficha-cliente";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { ConversationConnection, ConversationDetail, ConversationPage, LeadDetail } from "@/lib/api/types";

export const metadata = { title: "Conversaciones" };

type Filtros = {
  q?: string;
  status?: string;
  connection_id?: string;
  page?: string;
  c?: string;
  cliente?: string;
  agente?: string;
  editar?: string;
};

export default async function ConversationsPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.q) qs.set("q", sp.q);
  if (sp.status) qs.set("status", sp.status);
  if (sp.connection_id) qs.set("connection_id", sp.connection_id);
  if (sp.page) qs.set("page", sp.page);

  const [res, conexiones, detalle, ficha] = await Promise.all([
    apiFetch<ConversationPage>(`/admin/conversations${qs.size ? `?${qs.toString()}` : ""}`),
    apiFetch<ConversationConnection[]>("/admin/conversations/connections"),
    sp.c ? apiFetch<ConversationDetail>(`/admin/conversations/${encodeURIComponent(sp.c)}`) : null,
    sp.cliente ? apiFetch<LeadDetail>(`/admin/leads/${encodeURIComponent(sp.cliente)}`) : null,
  ]);
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar las conversaciones: {res.error}
      </p>
    );
  }
  const { items, page, has_more, total } = res.data;

  // La ficha se abre sobre la misma sección: conserva el chat (`c`) y los filtros.
  const qsFicha = new URLSearchParams(qs);
  if (sp.c) qsFicha.set("c", sp.c);
  const hrefBase = `/conversaciones${qsFicha.size ? `?${qsFicha.toString()}` : ""}`;

  return (
    <div data-ancho-completo className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        title="Conversaciones"
        description="Atiende a tus clientes en vivo: los mensajes llegan solos."
        helpSection="conversations"
        className="shrink-0"
      />

      {detalle && !detalle.ok && (
        <p role="alert" className="shrink-0 text-sm text-status-danger-fg">
          {detalle.status === 404
            ? "Esa conversación no existe o es de otro negocio."
            : `No se pudo abrir la conversación: ${detalle.error}`}
        </p>
      )}

      <Bandeja
        chats={items}
        query={qs.toString()}
        detalle={detalle?.ok ? detalle.data : null}
        pagina={page}
        total={total}
        hayMas={has_more}
        filtros={{ q: sp.q, status: sp.status, connectionId: sp.connection_id }}
        connections={conexiones.ok ? conexiones.data : []}
      />

      {ficha?.ok && (
        <FichaCliente
          key={`${ficha.data.id}-${sp.agente ?? "general"}-${sp.editar ?? ""}`}
          detalle={ficha.data}
          closeHref={hrefBase}
          agenteInicial={sp.agente}
          editarInicial={sp.editar === "1"}
          hrefBase={hrefBase}
        />
      )}
      {ficha && !ficha.ok && (
        <p role="alert" className="text-sm text-status-danger-fg">
          No se pudo abrir la ficha del cliente: {ficha.error}
        </p>
      )}
    </div>
  );
}
