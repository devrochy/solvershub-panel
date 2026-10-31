"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";

import type {
  ConversationConnection,
  ConversationDetail,
  ConversationSummary,
} from "@/lib/api/types";
import { useBandejaEnVivo } from "@/lib/conversaciones/en-vivo";
import { useVistos } from "@/lib/conversaciones/use-vistos";
import { cn } from "@/lib/utils";

import { ChatAbierto } from "./chat-abierto";
import { ConversationFilters } from "./conversation-filters";
import { ListaDeChats } from "./lista-de-chats";

/**
 * Bandeja estilo WhatsApp Web (HU-UX-15): la lista a la izquierda y el chat elegido
 * (`?c=<id>`) a la derecha. En el celular se ve una columna a la vez. La lista y el hilo
 * tienen su propio scroll; la página no crece.
 */
export function Bandeja({
  chats: iniciales,
  query,
  detalle,
  pagina,
  total,
  hayMas,
  filtros,
  connections,
}: {
  chats: ConversationSummary[];
  /** Filtros de la página (sin `c`), los mismos que repite el polling de la lista. */
  query: string;
  detalle: ConversationDetail | null;
  pagina: number;
  total: number;
  hayMas: boolean;
  filtros: { q?: string; status?: string; connectionId?: string };
  connections: ConversationConnection[];
}) {
  const router = useRouter();
  const {
    chats,
    total: totalEnVivo,
    hayMas: hayMasEnVivo,
    cargandoMas,
    error: errorDeCarga,
    cargarMas,
  } = useBandejaEnVivo(query, iniciales, { page: pagina, total, has_more: hayMas });
  const { marcar, visto } = useVistos();
  const seleccion = detalle?.id ?? null;

  const hrefDe = (id: string) => {
    const qs = new URLSearchParams(query);
    qs.set("c", id);
    return `/conversaciones?${qs}`;
  };
  const hrefVolver = query ? `/conversaciones?${query}` : "/conversaciones";

  // Si el chat abierto cambió de estado por fuera (el agente escaló, otra persona lo tomó o
  // lo devolvió), la lista lo trae primero: se refresca el detalle del servidor.
  const enLista = seleccion ? chats.find((c) => c.id === seleccion) : undefined;
  const cambioDeEstado =
    detalle != null &&
    enLista != null &&
    (enLista.status !== detalle.status || enLista.bot_paused !== detalle.bot_paused);
  useEffect(() => {
    if (cambioDeEstado) router.refresh();
  }, [cambioDeEstado, router]);

  // Al abrir (y mientras siga abierto, si llega actividad nueva) el chat queda visto: la
  // píldora del conteo desaparece en este dispositivo.
  const actividadAbierta =
    enLista?.last_message_at ??
    detalle?.last_message_at ??
    enLista?.started_at ??
    detalle?.started_at ??
    null;
  useEffect(() => {
    if (detalle && actividadAbierta) marcar(detalle.id, actividadAbierta);
  }, [detalle, actividadAbierta, marcar]);

  return (
    <div className="grid min-h-0 flex-1 overflow-hidden rounded-xl border border-border-soft bg-surface shadow-elev-1 lg:grid-cols-[minmax(19rem,22rem)_minmax(0,1fr)]">
      <nav
        aria-label="Lista de conversaciones"
        className={cn(
          "flex min-h-0 flex-col border-border-soft lg:border-r",
          seleccion && "hidden lg:flex",
        )}
      >
        <div className="shrink-0 border-b border-border-soft p-3">
          <ConversationFilters
            key={query}
            q={filtros.q}
            status={filtros.status}
            connectionId={filtros.connectionId}
            connections={connections}
            total={totalEnVivo}
          />
        </div>
        <div className="min-h-0 flex-1">
          <ListaDeChats
            key={query}
            chats={chats}
            seleccion={seleccion}
            hrefDe={hrefDe}
            visto={visto}
            hayMas={hayMasEnVivo}
            cargandoMas={cargandoMas}
            errorCarga={errorDeCarga}
            cargarMas={cargarMas}
          />
        </div>
      </nav>
      <section
        aria-label="Conversación"
        className={cn(
          "min-h-0",
          seleccion ? "flex flex-col" : "hidden lg:flex lg:items-center lg:justify-center",
        )}
      >
        {detalle ? (
          <ChatAbierto key={detalle.id} detalle={detalle} query={query} hrefVolver={hrefVolver} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-text-soft">
              <MessageSquare aria-hidden className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-headline">Elige una conversación</p>
            <p className="max-w-sm text-sm text-text-soft">
              Los mensajes nuevos llegan solos y el conteo desaparece al abrir el chat.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
