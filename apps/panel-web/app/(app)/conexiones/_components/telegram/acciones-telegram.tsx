"use client";

import { Button } from "@/components/ui/button";
import { BFF_TELEGRAM, mensajeErrorTelegram } from "@/lib/conexion-telegram";
import { useAction } from "@/lib/use-action";

async function postAccion(connectionId: string, accion: "refresh" | "webhooks", exito: string) {
  const res = await fetch(`${BFF_TELEGRAM}/${encodeURIComponent(connectionId)}/${accion}`, { method: "POST" });
  const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  return {
    ok: res.ok,
    status: res.status,
    error: mensajeErrorTelegram(json.code, json.error ?? "No se pudo completar la acción."),
    success: exito,
  };
}

/** Revisa ahora el token y el webhook del bot (lo mismo que el chequeo de cada 15 min). */
export function RefrescarTelegram({ connectionId }: { connectionId: string }) {
  const { run, pending } = useAction();
  return (
    <Button variant="outline" loading={pending} onClick={() => void run(() => postAccion(connectionId, "refresh", "Revisión lista."))}>
      Revisar ahora
    </Button>
  );
}

/** Vuelve a apuntar el webhook del bot a solvershub (si otro sistema lo cambió). */
export function RepararWebhookTelegram({ connectionId }: { connectionId: string }) {
  const { run, pending } = useAction();
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
      onClick={() => void run(() => postAccion(connectionId, "webhooks", "Webhook registrado otra vez."))}
    >
      Reparar
    </Button>
  );
}
