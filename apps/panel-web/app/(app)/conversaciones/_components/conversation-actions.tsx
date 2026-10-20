"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/lib/use-action";

import { TemplatePicker } from "./template-picker";

type Action = "message" | "toggle-bot" | "resolve";

/**
 * Acciones de la conversación: responder como humano, pausar el agente y resolver. En la
 * bandeja (HU-UX-15) la caja de respuesta solo aparece mientras una persona atiende.
 */
export function ConversationActions({
  conversationId,
  botPaused,
  status,
  showComposer = true,
}: {
  conversationId: string;
  botPaused: boolean;
  status: string;
  showComposer?: boolean;
}) {
  const confirm = useConfirm();
  const [content, setContent] = useState("");
  const [paused, setPaused] = useState(botPaused);
  // Tomar o devolver el chat cambia la pausa desde el servidor: se sigue a la prop.
  const [pausaDelServidor, setPausaDelServidor] = useState(botPaused);
  if (pausaDelServidor !== botPaused) {
    setPausaDelServidor(botPaused);
    setPaused(botPaused);
  }
  const [enviando, setEnviando] = useState(false);
  const [accionEnCurso, setAccionEnCurso] = useState(false);
  // HU-ARCH-13: la API respondió 409 `window_expired` → se ofrece una plantilla.
  const [ventanaVencida, setVentanaVencida] = useState(false);

  async function post(action: Action, body?: Record<string, unknown>) {
    const res = await fetch(`/api/conversations/${conversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    if (action === "message" && json.code === "window_expired") setVentanaVencida(true);
    return { ok: res.ok, error: json.error };
  }

  const enviar = useAction({ refresh: false });
  const actuar = useAction();

  function send() {
    const text = content.trim();
    if (!text) return;
    setEnviando(true);
    void enviar
      .run(() => post("message", { content: text }))
      .then((ok) => {
        if (ok) setContent("");
      })
      .finally(() => setEnviando(false));
  }

  async function toggleBot() {
    const antes = paused;
    setPaused(!antes);
    const ok = await actuar.run(() => post("toggle-bot"));
    if (!ok) setPaused(antes);
  }

  async function resolve() {
    const aceptado = await confirm({
      title: "Resolver conversación",
      description:
        "Se cerrará la conversación y el cliente dejará de recibir respuestas del asistente.",
      confirmLabel: "Resolver",
      destructive: true,
    });
    if (!aceptado) return;
    setAccionEnCurso(true);
    try {
      await actuar.run(() => post("resolve"));
    } finally {
      setAccionEnCurso(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void toggleBot()}
          disabled={accionEnCurso}
        >
          {paused ? "Reanudar agente" : "Pausar agente"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void resolve()}
          disabled={status === "closed" || accionEnCurso}
        >
          Resolver conversación
        </Button>
      </div>

      {showComposer && ventanaVencida && (
        <TemplatePicker conversationId={conversationId} onSent={() => setVentanaVencida(false)} />
      )}

      {showComposer && (
        <div className="flex flex-col gap-2">
          <Textarea
            rows={2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribe como persona del equipo…"
            aria-label="Mensaje para el cliente"
          />
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="accent"
              size="sm"
              onClick={send}
              disabled={!content.trim() || enviando}
            >
              {enviando ? "Enviando…" : "Enviar mensaje"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
