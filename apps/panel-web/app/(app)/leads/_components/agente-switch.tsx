"use client";

import { useState } from "react";

import { Switch } from "@/components/ui/switch";
import { useAction } from "@/lib/use-action";

/** Interruptor «Agente» de un cliente: apagado, el agente no le responde en ninguna conversación. */
export function AgenteSwitch({ leadId, botPaused, nombre }: { leadId: string; botPaused: boolean; nombre: string }) {
  const [activo, setActivo] = useState(!botPaused);
  const [delServidor, setDelServidor] = useState(botPaused);
  if (delServidor !== botPaused) {
    setDelServidor(botPaused);
    setActivo(!botPaused);
  }
  const accion = useAction({ rollback: () => setActivo((v) => !v) });

  async function cambiar(siguiente: boolean) {
    setActivo(siguiente);
    await accion.run(async () => {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-bot" }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        ok: res.ok,
        status: res.status,
        error: json.error,
        success: siguiente ? `El agente vuelve a atender a ${nombre}.` : `Agente pausado para ${nombre}.`,
      };
    });
  }

  return (
    <Switch
      checked={activo}
      onCheckedChange={(v) => void cambiar(v)}
      disabled={accion.pending}
      aria-label={activo ? `Pausar el agente para ${nombre}` : `Activar el agente para ${nombre}`}
    />
  );
}
