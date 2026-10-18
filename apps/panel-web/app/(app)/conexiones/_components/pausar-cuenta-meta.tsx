"use client";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { useAction } from "@/lib/use-action";

/**
 * Pausar o reanudar desde la consola (HU-AOS-23). Solo la cuenta de Meta (ADR-0122): es la
 * única pausa que hoy detiene la entrada y la salida. Reusa el BFF de acciones de conexiones.
 */
export function PausarCuentaMeta({
  metaConnectionId,
  pausada,
  textoConfirmacion,
}: {
  metaConnectionId: string;
  pausada: boolean;
  textoConfirmacion: string;
}) {
  const confirm = useConfirm();
  const { run, pending } = useAction();

  async function alternar() {
    if (!pausada) {
      const aceptado = await confirm({
        title: "Pausar conexión",
        description: textoConfirmacion,
        confirmLabel: "Pausar",
        destructive: true,
      });
      if (!aceptado) return;
    }
    await run(async () => {
      const res = await fetch(`/api/connections/${metaConnectionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: pausada ? "activate" : "deactivate", kind: "meta_connection" }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        ok: res.ok,
        error: json.error,
        status: res.status,
        success: pausada ? "Conexión reanudada." : "Conexión pausada.",
      };
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={() => void alternar()} loading={pending}>
      {pausada ? "Reanudar" : "Pausar"}
    </Button>
  );
}
