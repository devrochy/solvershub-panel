import { Bandeja } from "@/app/(app)/conversaciones/_components/bandeja";
import { FichaCliente } from "@/components/domain/cliente/ficha-cliente";
import { BotonReintentar, EstadoDeError } from "@/components/ui/estado-de-error";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { ConversationConnection, ConversationDetail, ConversationPage, LeadDetail, Me } from "@/lib/api/types";
import { esPropietarioOPlataforma } from "@/lib/clientes";
import { cn } from "@/lib/utils";

export const metadata = { title: "Conversaciones" };

const CABECERA = {
  title: "Conversaciones",
  description: "Atiende a tus clientes en vivo: los mensajes llegan solos.",
  helpSection: "conversations",
  densidad: "compacta",
} as const;

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

  const [res, conexiones, detalle, ficha, me] = await Promise.all([
    apiFetch<ConversationPage>(`/admin/conversations${qs.size ? `?${qs.toString()}` : ""}`),
    apiFetch<ConversationConnection[]>("/admin/conversations/connections"),
    sp.c ? apiFetch<ConversationDetail>(`/admin/conversations/${encodeURIComponent(sp.c)}`) : null,
    sp.cliente ? apiFetch<LeadDetail>(`/admin/leads/${encodeURIComponent(sp.cliente)}`) : null,
    // Para el «La atiendes tú» del aviso y para decidir si la ficha ofrece retirar los datos del
    // cliente; el servidor lo exige igual.
    apiFetch<Me>("/admin/me"),
  ]);
  if (!res.ok) {
    return (
      <div data-ancho-completo className="flex min-h-0 flex-1 flex-col gap-4">
        <PageHeader {...CABECERA} className="shrink-0" />
        <div className="flex min-h-0 flex-1 rounded-lg border border-border-soft bg-surface">
          <EstadoDeError
            className="flex-1"
            titulo="No pudimos cargar las conversaciones"
            descripcion="Revisa tu conexión y vuelve a intentarlo. Si sigue pasando, avísanos."
            detalle={res.error}
            accion={<BotonReintentar />}
          />
        </div>
      </div>
    );
  }
  const { items, page, has_more, total } = res.data;

  // La ficha se abre sobre la misma sección: conserva el chat (`c`) y los filtros.
  const qsFicha = new URLSearchParams(qs);
  if (sp.c) qsFicha.set("c", sp.c);
  const hrefBase = `/conversaciones${qsFicha.size ? `?${qsFicha.toString()}` : ""}`;

  const errorDeChat =
    detalle && !detalle.ok
      ? detalle.status === 404
        ? {
            titulo: "Esa conversación no existe o es de otro negocio.",
            descripcion: "Puede que el enlace sea viejo. Elige otra conversación de la lista.",
          }
        : {
            titulo: "No pudimos abrir la conversación",
            descripcion: "Vuelve a intentarlo o elige otra de la lista.",
            detalle: detalle.error,
          }
      : null;

  return (
    <div data-ancho-completo className="flex min-h-0 flex-1 flex-col gap-4">
      {/* En el celular, con un chat abierto, el chat ocupa la pantalla y trae su «Volver». */}
      <PageHeader {...CABECERA} className={cn("shrink-0", sp.c && "max-lg:hidden")} />

      <Bandeja
        errorDeChat={errorDeChat}
        miCorreo={me.ok ? me.data.email : undefined}
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
          esPropietario={me.ok ? esPropietarioOPlataforma(me.data) : false}
        />
      )}
      {ficha && !ficha.ok && (
        <EstadoDeError forma="en-linea" titulo="No pudimos abrir la ficha del cliente" detalle={ficha.error} />
      )}
    </div>
  );
}
