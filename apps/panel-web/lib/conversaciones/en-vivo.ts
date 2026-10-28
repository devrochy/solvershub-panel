"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ConversationPage, MessageItem, MessagesSince } from "@/lib/api/types";

// Bandeja en vivo (HU-UX-15, D-SPEC-31-1): polling solo con la pestaña visible, sin SSE.
/** Hilo abierto: lo nuevo con `?after=` cada 4 s. */
export const INTERVALO_HILO_MS = 4_000;
/** Lista de chats: la primera página completa cada 12 s (el orden cambia con la actividad). */
export const INTERVALO_LISTA_MS = 12_000;

function pestanaVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

/**
 * Llama a `tarea` cada `intervaloMs` mientras la pestaña esté visible. Con la pestaña oculta
 * no consulta; al volver a verse consulta enseguida. Nunca solapa dos llamadas: si la
 * anterior no terminó, se salta el tick.
 */
export function usePolling(tarea: (senal: AbortSignal) => Promise<void>, intervaloMs: number, activo = true) {
  const tareaRef = useRef(tarea);
  useEffect(() => {
    tareaRef.current = tarea;
  }, [tarea]);

  useEffect(() => {
    if (!activo) return;
    const control = new AbortController();
    let enVuelo = false;

    async function tick() {
      if (enVuelo || !pestanaVisible() || control.signal.aborted) return;
      enVuelo = true;
      try {
        await tareaRef.current(control.signal);
      } catch {
        // Un fallo de red no corta el polling: el siguiente tick lo intenta de nuevo.
      } finally {
        enVuelo = false;
      }
    }

    const id = window.setInterval(() => void tick(), intervaloMs);
    function alCambiarVisibilidad() {
      if (pestanaVisible()) void tick();
    }
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => {
      control.abort();
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, [intervaloMs, activo]);
}

/** Une mensajes por `id` (el servidor re-entrega el solape del cursor) y los ordena. */
export function unirMensajes(actuales: MessageItem[], nuevos: MessageItem[]): MessageItem[] {
  if (nuevos.length === 0) return actuales;
  const porId = new Map(actuales.map((m) => [m.id, m]));
  for (const m of nuevos) porId.set(m.id, m);
  return [...porId.values()].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );
}

/**
 * Cursor para `?after=`: el `created_at` del último mensaje tal como lo mandó la API.
 * No se pasa por `Date`: perdería los microsegundos.
 */
export function cursorDe(mensajes: MessageItem[]): string | null {
  return mensajes.length ? mensajes[mensajes.length - 1].created_at : null;
}

/** Hilo de un chat que se actualiza solo (cada `INTERVALO_HILO_MS`). */
export function useHiloEnVivo(conversationId: string, iniciales: MessageItem[]) {
  const [mensajes, setMensajes] = useState(iniciales);
  const mensajesRef = useRef(iniciales);
  // La vista del servidor se refrescó (p. ej. tras tomar el chat): se suman sus mensajes.
  const [delServidor, setDelServidor] = useState(iniciales);
  if (delServidor !== iniciales) {
    setDelServidor(iniciales);
    setMensajes((actuales) => unirMensajes(actuales, iniciales));
  }
  useEffect(() => {
    mensajesRef.current = mensajes;
  }, [mensajes]);

  const consultar = useCallback(
    async (senal: AbortSignal) => {
      const cursor = cursorDe(mensajesRef.current);
      const qs = cursor ? `?after=${encodeURIComponent(cursor)}` : "";
      const res = await fetch(`/api/conversations/${conversationId}/messages${qs}`, {
        signal: senal,
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as MessagesSince;
      if (senal.aborted) return;
      const unidos = unirMensajes(mensajesRef.current, data.items);
      mensajesRef.current = unidos;
      setMensajes(unidos);
    },
    [conversationId],
  );

  usePolling(consultar, INTERVALO_HILO_MS);
  return mensajes;
}

type ChatDeLista = ConversationPage["items"][number];

/** Momento de actividad del chat: su último mensaje o, si no tiene, el inicio. */
function actividadDe(chat: ChatDeLista): number {
  const ms = Date.parse(chat.last_message_at ?? chat.started_at);
  return Number.isFinite(ms) ? ms : 0;
}

/** Orden de la bandeja como en las apps de chat: lo último que llegó, primero. */
export function ordenarPorLlegada(chats: ChatDeLista[]): ChatDeLista[] {
  return [...chats].sort((a, b) => actividadDe(b) - actividadDe(a) || b.id.localeCompare(a.id));
}

/** Lista de chats que se actualiza sola (cada `INTERVALO_LISTA_MS`) con los mismos filtros. */
export function useListaEnVivo(query: string, iniciales: ChatDeLista[]) {
  const [chats, setChats] = useState(() => ordenarPorLlegada(iniciales));
  // La vista del servidor se refrescó (filtros, una acción): manda la del servidor.
  const [delServidor, setDelServidor] = useState(iniciales);
  if (delServidor !== iniciales) {
    setDelServidor(iniciales);
    setChats(ordenarPorLlegada(iniciales));
  }

  const consultar = useCallback(
    async (senal: AbortSignal) => {
      const res = await fetch(`/api/conversations${query ? `?${query}` : ""}`, {
        signal: senal,
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as ConversationPage;
      if (!senal.aborted) setChats(ordenarPorLlegada(data.items));
    },
    [query],
  );

  usePolling(consultar, INTERVALO_LISTA_MS);
  return chats;
}
