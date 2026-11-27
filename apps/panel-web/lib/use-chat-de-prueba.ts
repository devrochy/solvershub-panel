"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

import type { InteractivoLeido } from "@/lib/playground-opciones";

/** Un turno del chat de prueba: lo del cliente (`user`) o lo del agente (`assistant`). */
export type TurnoDePrueba = { role?: string; text?: string; content?: string; interactivo?: InteractivoLeido; simulado?: boolean };

export function textoDelTurno(t: TurnoDePrueba): string {
  return t.text ?? t.content ?? JSON.stringify(t);
}

export type ChatDePrueba = {
  turnos: TurnoDePrueba[];
  setTurnos: Dispatch<SetStateAction<TurnoDePrueba[]>>;
  cargando: boolean;
  error?: string;
  setEstado: (estado: { loading?: boolean; error?: string }) => void;
  /** Manda una frase como cliente. Devuelve si el agente contestó. */
  enviar: (frase: string) => Promise<boolean>;
  /** Vuelve a empezar la conversación. Devuelve si se pudo. */
  reiniciar: () => Promise<boolean>;
};

/**
 * La conversación del chat de prueba (`/api/playground`), sin su vista: la usan `ChatPrueba` (ficha y asistente) y
 * el celular de la estación 5 (HU-UX-31). Con `agenteId` le habla al BORRADOR de ese agente sin publicarlo
 * (HU-AOS-72); con `conexionId`, a la versión activa de esa conexión (HU-AOS-57). `agenteId` gana.
 *
 * Mientras está `activo` lee el historial y, al dejar de estarlo o al desmontar, cierra la prueba (HU-ARCH-14: el
 * backend la purga; `keepalive` cubre el cierre de pestaña). Por eso vive una sola vez por pantalla: el celular se
 * pinta dos veces (columna y panel lateral) y las dos copias leen este mismo estado.
 */
export function useChatDePrueba({
  agenteId,
  conexionId,
  activo = true,
  alRecibirRespuesta,
}: {
  agenteId?: string;
  conexionId?: string;
  activo?: boolean;
  alRecibirRespuesta?: () => void;
}): ChatDePrueba {
  const [turnos, setTurnos] = useState<TurnoDePrueba[]>([]);
  const [estado, setEstado] = useState<{ loading?: boolean; error?: string }>({});
  const destino: Record<string, string> = agenteId ? { agent_id: agenteId } : conexionId ? { connection_id: conexionId } : {};
  const consulta = new URLSearchParams(destino).toString();
  const alResponder = useRef(alRecibirRespuesta);
  useEffect(() => {
    alResponder.current = alRecibirRespuesta;
  });

  useEffect(() => {
    if (!activo) return;
    let vigente = true;
    void (async () => {
      const res = await fetch(`/api/playground${consulta ? `?${consulta}` : ""}`).catch(() => null);
      const json = (await res?.json().catch(() => ({}))) as { turns?: TurnoDePrueba[] } | undefined;
      if (vigente) setTurnos(json?.turns ?? []);
    })();
    return () => {
      vigente = false;
      void fetch("/api/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close", ...Object.fromEntries(new URLSearchParams(consulta)) }),
        keepalive: true,
      }).catch(() => undefined);
    };
  }, [consulta, activo]);

  async function enviar(frase: string): Promise<boolean> {
    const limpio = frase.trim();
    if (!limpio) return false;
    setEstado({ loading: true });
    setTurnos((previos) => [...previos, { role: "user", text: limpio }]);
    const res = await fetch("/api/playground", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "message", text: limpio, ...destino }),
    }).catch(() => null);
    const json = (await res?.json().catch(() => ({}))) as
      | { text?: string; image_url?: string | null; escalated?: boolean; simulado?: boolean; error?: string }
      | undefined;
    if (!res?.ok) {
      setEstado({ loading: false, error: json?.error ?? "No se pudo procesar el mensaje." });
      return false;
    }
    setEstado({ loading: false });
    setTurnos((previos) => [
      ...previos,
      { role: "assistant", text: json?.text ?? "(sin respuesta)", simulado: json?.simulado },
      ...(json?.escalated ? [{ role: "assistant", text: "⚠️ Escalado a un humano" }] : []),
    ]);
    if (!json?.escalated) alResponder.current?.();
    return true;
  }

  async function reiniciar(): Promise<boolean> {
    setEstado({ loading: true });
    const res = await fetch("/api/playground", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset", ...destino }),
    }).catch(() => null);
    if (!res?.ok) {
      setEstado({ loading: false, error: "No se pudo reiniciar la prueba." });
      return false;
    }
    setEstado({ loading: false });
    setTurnos([]);
    return true;
  }

  return { turnos, setTurnos, cargando: Boolean(estado.loading), error: estado.error, setEstado, enviar, reiniciar };
}
