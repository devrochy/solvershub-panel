"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import type { ConversationDetail, ConversationSummary } from "@/lib/api/types";
import { useListaEnVivo } from "@/lib/conversaciones/en-vivo";
import { cn } from "@/lib/utils";

import { ChatAbierto } from "./chat-abierto";
import { ListaDeChats } from "./lista-de-chats";

/**
 * Bandeja estilo WhatsApp Web (HU-UX-15): la lista a la izquierda y el chat elegido
 * (`?c=<id>`) a la derecha. En el celular se ve una columna a la vez.
 */
export function Bandeja({
  chats: iniciales,
  query,
  detalle,
}: {
  chats: ConversationSummary[];
  /** Filtros de la página (sin `c`), los mismos que repite el polling de la lista. */
  query: string;
  detalle: ConversationDetail | null;
}) {
  const router = useRouter();
  const chats = useListaEnVivo(query, iniciales);
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

  return (
    <div className="grid h-[calc(100dvh-16rem)] min-h-[28rem] grid-cols-1 overflow-hidden rounded-lg border border-border-soft bg-surface shadow-elev-1 lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
      <nav
        aria-label="Lista de conversaciones"
        className={cn(
          "min-h-0 overflow-y-auto border-border-soft lg:border-r",
          seleccion && "hidden lg:block",
        )}
      >
        <ListaDeChats chats={chats} seleccion={seleccion} hrefDe={hrefDe} />
      </nav>
      <section
        aria-label="Conversación"
        className={cn("min-h-0", seleccion ? "flex flex-col" : "hidden lg:flex lg:items-center lg:justify-center")}
      >
        {detalle ? (
          <ChatAbierto key={detalle.id} detalle={detalle} hrefVolver={hrefVolver} />
        ) : (
          <EmptyState
            title="Elige una conversación"
            description="Los mensajes nuevos llegan solos; no hace falta refrescar."
          />
        )}
      </section>
    </div>
  );
}
