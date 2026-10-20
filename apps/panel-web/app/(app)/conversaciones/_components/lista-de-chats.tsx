"use client";

import Link from "next/link";

import { ChannelIcon } from "@/components/domain/channel-icon";
import { CONVERSATION_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import type { ConversationSummary } from "@/lib/api/types";
import { formatHoraChat } from "@/lib/format";
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

/** Columna izquierda de la bandeja: un renglón por chat, del más reciente al más viejo. */
export function ListaDeChats({
  chats,
  seleccion,
  hrefDe,
}: {
  chats: ConversationSummary[];
  seleccion: string | null;
  hrefDe: (id: string) => string;
}) {
  if (chats.length === 0) {
    return (
      <EmptyState
        title="Sin conversaciones"
        description="Aparecerán aquí en cuanto un cliente escriba. Revisa los filtros si esperabas ver alguna."
      />
    );
  }
  return (
    <ul aria-label="Chats" className="flex flex-col">
      {chats.map((chat) => {
        const activo = chat.id === seleccion;
        const nombre = nombreDelChat(chat);
        return (
          <li key={chat.id} className="border-b border-border-soft last:border-b-0">
            <Link
              href={hrefDe(chat.id)}
              aria-current={activo ? "true" : undefined}
              scroll={false}
              className={cn(
                "flex gap-3 px-4 py-3 transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2",
                activo && "bg-surface-2",
              )}
            >
              <Avatar name={nombre} size="md" />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-medium text-headline">{nombre}</span>
                  <span
                    className="ml-auto shrink-0 text-xs tabular-nums text-text-soft"
                    suppressHydrationWarning
                  >
                    {formatHoraChat(chat.last_message_at ?? chat.started_at)}
                  </span>
                </span>
                <span className="truncate text-sm text-body">
                  {chat.last_message != null ? (
                    <>
                      {PREFIJO[chat.last_message_sender ?? ""] ?? ""}
                      {chat.last_message || "(sin texto)"}
                    </>
                  ) : (
                    <span className="italic text-text-soft">Sin mensajes</span>
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
  );
}
