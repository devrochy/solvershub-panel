"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

import { ChannelIcon } from "@/components/domain/channel-icon";
import { CONVERSATION_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { ConversationSummary } from "@/lib/api/types";
import { contadorPendientes, formatHoraChat, textoPendientes } from "@/lib/format";
import { CANAL, canalLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

const PREFIJO: Record<string, string> = { agent: "Agente: ", human: "Equipo: " };

export function nombreDelChat(chat: Pick<ConversationSummary, "customer_name" | "external_id">): string {
  return chat.customer_name || chat.external_id || "Cliente";
}

/** Tipo para el ícono y la etiqueta: el de la conexión si el panel lo conoce (p. ej.
 * `whatsapp_waweb`), si no el canal de la conversación. */
export function tipoDelChat(chat: Pick<ConversationSummary, "connection_type" | "channel">): string {
  return chat.connection_type && CANAL[chat.connection_type] ? chat.connection_type : chat.channel;
}

/** Canal y conexión de un chat: «WhatsApp · Ventas» (como el chip de agent-sale). */
export function conexionDelChat(chat: Pick<ConversationSummary, "connection_type" | "channel" | "connection_label">): string {
  const canal = canalLabel(tipoDelChat(chat));
  return chat.connection_label ? `${canal} · ${chat.connection_label}` : canal;
}

/**
 * Columna izquierda de la bandeja: un renglón por chat, del más reciente al más viejo.
 * Scrollea por dentro y pide la siguiente página al llegar al final («scroll infinito»).
 */
export function ListaDeChats({
  chats,
  seleccion,
  hrefDe,
  visto,
  hayMas,
  cargandoMas,
  errorCarga,
  cargarMas,
}: {
  chats: ConversationSummary[];
  seleccion: string | null;
  hrefDe: (id: string) => string;
  visto: (chat: ConversationSummary) => boolean;
  hayMas: boolean;
  cargandoMas: boolean;
  errorCarga: string | null;
  cargarMas: () => Promise<void>;
}) {
  const raizRef = useRef<HTMLDivElement>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hayMas || cargandoMas) return;
    const raiz = raizRef.current;
    const fin = finRef.current;
    // Sin IntersectionObserver (navegadores viejos, jsdom) queda el botón «Cargar más».
    if (!raiz || !fin || typeof IntersectionObserver === "undefined") return;
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) void cargarMas();
      },
      { root: raiz, rootMargin: "0px 0px 200px 0px" },
    );
    observador.observe(fin);
    return () => observador.disconnect();
  }, [hayMas, cargandoMas, cargarMas]);

  if (chats.length === 0) {
    return (
      <EmptyState
        title="Sin conversaciones"
        description="Aparecerán aquí en cuanto un cliente escriba. Revisa los filtros si esperabas ver alguna."
      />
    );
  }

  return (
    <div ref={raizRef} className="h-full overflow-y-auto overscroll-contain">
      <ul aria-label="Chats" className="flex flex-col">
        {chats.map((chat) => {
          const activo = chat.id === seleccion;
          const nombre = nombreDelChat(chat);
          const pendientes = chat.pending_count ?? 0;
          const nuevo = pendientes > 0 && !visto(chat);
          return (
            <li key={chat.id} className="border-b border-border-soft last:border-b-0">
              <Link
                href={hrefDe(chat.id)}
                aria-current={activo ? "true" : undefined}
                scroll={false}
                className={cn(
                  "relative flex gap-3 px-4 py-3.5 transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2",
                  activo && "bg-surface-raised",
                )}
              >
                {activo && (
                  <span
                    aria-hidden
                    className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-focus"
                  />
                )}
                <Avatar name={nombre} size="md" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "truncate text-sm text-headline",
                        nuevo ? "font-semibold" : "font-medium",
                      )}
                    >
                      {nombre}
                    </span>
                    <span
                      className={cn(
                        "ml-auto shrink-0 text-xs tabular-nums",
                        nuevo ? "font-medium text-headline" : "text-text-soft",
                      )}
                      suppressHydrationWarning
                    >
                      {formatHoraChat(chat.last_message_at ?? chat.started_at)}
                    </span>
                  </span>
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm",
                        nuevo ? "text-headline" : "text-body",
                      )}
                    >
                      {chat.last_message != null ? (
                        <>
                          {PREFIJO[chat.last_message_sender ?? ""] ?? ""}
                          {chat.last_message || "(sin texto)"}
                        </>
                      ) : (
                        <span className="italic text-text-soft">Sin mensajes</span>
                      )}
                    </span>
                    {nuevo && (
                      <>
                        <span
                          aria-hidden
                          className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-cta px-1.5 text-[11px] font-semibold leading-none tabular-nums text-white"
                        >
                          {contadorPendientes(pendientes)}
                        </span>
                        <span className="sr-only">{textoPendientes(pendientes)}</span>
                      </>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <ChannelIcon id={tipoDelChat(chat)} size="sm" />
                    <span className="truncate text-xs text-text-soft">{conexionDelChat(chat)}</span>
                    <span className="ml-auto shrink-0">
                      <StatusBadge value={chat.status} map={CONVERSATION_STATUS} />
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div ref={finRef} className="flex flex-col items-center gap-2 px-4 py-4">
        {errorCarga && (
          <p role="alert" className="text-xs text-status-danger-fg">
            {errorCarga}
          </p>
        )}
        {cargandoMas ? (
          <span role="status" className="text-xs text-text-soft">
            Cargando más…
          </span>
        ) : hayMas ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => void cargarMas()}>
            Cargar más
          </Button>
        ) : (
          <span className="text-xs text-text-soft">No hay más conversaciones</span>
        )}
      </div>
    </div>
  );
}
