"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Textarea } from "@/components/ui/textarea";

type Action = "message" | "toggle-bot" | "resolve";

/** Acciones de la conversación: responder como humano, pausar el agente y resolver. */
export function ConversationActions({
  conversationId,
  botPaused,
  status,
}: {
  conversationId: string;
  botPaused: boolean;
  status: string;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [paused, setPaused] = useState(botPaused);
  const [state, setState] = useState<{ loading?: Action; error?: string; success?: string }>({});

  async function run(action: Action, body?: Record<string, unknown>) {
    setState({ loading: action });
    const res = await fetch(`/api/conversations/${conversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setState({ error: json.error ?? "No se pudo completar la acción." });
      return;
    }
    setState({ success: action === "message" ? "Mensaje enviado." : "Listo." });
    router.refresh();
  }

  function send() {
    const text = content.trim();
    if (!text) return;
    void run("message", { content: text }).then(() => setContent(""));
  }

  function toggleBot() {
    setPaused((prev) => !prev);
    void run("toggle-bot");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleBot}
          disabled={state.loading !== undefined}
        >
          {paused ? "Reanudar agente" : "Pausar agente"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void run("resolve")}
          disabled={status === "closed" || state.loading !== undefined}
        >
          Resolver conversación
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Textarea
          rows={2}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setState({});
          }}
          placeholder="Escribe como persona del equipo…"
          aria-label="Mensaje para el cliente"
        />
        <div className="flex items-center justify-between gap-3">
          <FormFeedback error={state.error} success={state.success} />
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={send}
            disabled={!content.trim() || state.loading === "message"}
          >
            {state.loading === "message" ? "Enviando…" : "Enviar mensaje"}
          </Button>
        </div>
      </div>
    </div>
  );
}
