"use client";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { useAction } from "@/lib/use-action";

/**
 * Pausar o reanudar desde la consola (HU-AOS-23). La cuenta de Meta (ADR-0122) o una conexión
 * manual o de WhatsApp Web (adenda 2026-10-19): las dos detienen la entrada y la salida. Reusa
 * el BFF de acciones de conexiones, que el backend audita (`connection.paused` / `resumed`).
 */
export function PausarConexion({
  id,
  tipo,
  pausada,
  textoConfirmacion,
}: {
  id: string;
  /** `meta_connection`: la cuenta de Meta; `channel`: la conexión manual o de WhatsApp Web. */
  tipo: "meta_connection" | "channel";
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
      const res = await fetch(`/api/connections/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: pausada ? "activate" : "deactivate",
          ...(tipo === "meta_connection" ? { kind: "meta_connection" } : {}),
        }),
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
