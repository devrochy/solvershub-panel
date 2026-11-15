"use client";

import { Button } from "@/components/ui/button";
import { BFF_TWILIO, mensajeErrorTwilio } from "@/lib/conexion-twilio";
import { useAction } from "@/lib/use-action";

async function postAccion(connectionId: string, accion: "refresh" | "webhooks", exito: string) {
  const res = await fetch(`${BFF_TWILIO}/${encodeURIComponent(connectionId)}/${accion}`, { method: "POST" });
  const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  return {
    ok: res.ok,
    status: res.status,
    error: mensajeErrorTwilio(json.code, json.error ?? "No se pudo completar la acción."),
    success: exito,
  };
}

/** Revisa ahora la cuenta, el número y los webhooks contra Twilio (lo mismo que el chequeo de cada 15 min). */
export function RefrescarTwilio({ connectionId }: { connectionId: string }) {
  const { run, pending } = useAction();
  return (
    <Button variant="outline" loading={pending} onClick={() => void run(() => postAccion(connectionId, "refresh", "Revisión lista."))}>
      Revisar ahora
    </Button>
  );
}

/** Vuelve a apuntar los webhooks del número a solvershub (si alguien los cambió en la consola de Twilio). */
export function ReregistrarWebhooksTwilio({ connectionId }: { connectionId: string }) {
  const { run, pending } = useAction();
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
      onClick={() => void run(() => postAccion(connectionId, "webhooks", "Webhooks registrados otra vez."))}
    >
      Registrar de nuevo
    </Button>
  );
}
