"use client";

import { Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { useAction } from "@/lib/use-action";

/** Lo que pide cada 409 de la pausa, en palabras del dueño. */
const ERRORES: Record<string, string> = {
  agent_reserved: "El Coordinador no se pausa: para detener al asistente, pausa el negocio en Configuración.",
  agent_archived: "Un agente archivado ya no atiende: no hace falta pausarlo.",
};

/**
 * Pausar o reanudar un especialista desde su ficha (HU-ARCH-38). Aplica en segundos y sin publicar: mientras está
 * en pausa atiende el agente por defecto y nadie le pasa conversaciones; al reanudar vuelve a atender las suyas.
 * Solo especialistas activos (el Coordinador y los archivados no llegan aquí; la API los rechaza igual).
 */
export function PausarAgente({ agenteId, nombre, pausado }: { agenteId: string; nombre: string; pausado: boolean }) {
  const confirm = useConfirm();
  const { run, pending } = useAction();

  async function cambiar() {
    const ok = await confirm(
      pausado
        ? {
            title: `¿Reanudar a ${nombre}?`,
            description: "Vuelve a atender sus conversaciones desde el siguiente mensaje.",
            confirmLabel: "Reanudar",
            destructive: false,
          }
        : {
            title: `¿Pausar a ${nombre}?`,
            description:
              "Deja de atender desde el siguiente mensaje, sin publicar nada. Sus conversaciones las atiende el agente por defecto y ningún otro agente le pasa clientes. Si este es el agente por defecto, nadie responde hasta que lo reanudes.",
            confirmLabel: "Pausar",
          },
    );
    if (!ok) return;
    await run(async () => {
      const res = await fetch(`/api/agent-editor/${agenteId}/${pausado ? "resume" : "pause"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (res.ok) return { ok: true, success: pausado ? "Agente reanudado." : "Agente en pausa." };
      const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      return {
        ok: false,
        status: res.status,
        error: (json.code && ERRORES[json.code]) || json.error || "No se pudo guardar.",
      };
    });
  }

  return (
    <Button variant="outline" onClick={cambiar} disabled={pending}>
      {pausado ? <Play aria-hidden /> : <Pause aria-hidden />}
      {pausado ? "Reanudar" : "Pausar"}
    </Button>
  );
}
