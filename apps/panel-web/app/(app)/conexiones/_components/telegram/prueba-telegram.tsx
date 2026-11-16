"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { BFF_TELEGRAM, errorDeChatId, mensajeErrorTelegram } from "@/lib/conexion-telegram";
import { useAction } from "@/lib/use-action";

/**
 * Mensaje de prueba por el bot (HU-CONN-27): un texto fijo a un chat que ya le escribió al bot. Telegram no deja que
 * un bot inicie una conversación, así que primero hay que abrir el bot y tocar Iniciar. La respuesta de Telegram es
 * inmediata: si sale, llegó al chat. El backend permite una prueba cada 30 s y 10 al día.
 */
export function PruebaTelegram({ connectionId }: { connectionId: string }) {
  const { run, pending } = useAction({ refresh: false });
  const [chatError, setChatError] = useState<string>();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const chat = String(new FormData(event.currentTarget).get("chat_id") ?? "").trim();
    const error = errorDeChatId(chat);
    setChatError(error);
    if (error) return;
    await run(async () => {
      const res = await fetch(`${BFF_TELEGRAM}/${encodeURIComponent(connectionId)}/test-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: Number(chat) }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      return {
        ok: res.ok,
        status: res.status,
        error: mensajeErrorTelegram(json.code, json.error ?? "No se pudo enviar la prueba."),
        success: "Prueba enviada: revisa ese chat de Telegram.",
      };
    });
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => void onSubmit(e)} noValidate>
      <Field
        label="Id del chat"
        htmlFor="telegram_prueba_chat"
        error={chatError}
        help="Un número, por ejemplo 123456789. Lo ves en Conversaciones cuando ese chat le escribe al bot."
      >
        <Input
          id="telegram_prueba_chat"
          name="chat_id"
          inputMode="numeric"
          autoComplete="off"
          placeholder="123456789"
          className="sm:max-w-xs"
        />
      </Field>
      <div>
        <Button type="submit" variant="accent" loading={pending}>
          Enviar mensaje de prueba
        </Button>
      </div>
    </form>
  );
}
