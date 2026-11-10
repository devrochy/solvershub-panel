"use client";

import { Pause, Play } from "lucide-react";

import { MenuDeFila } from "@/components/domain/menu-de-fila";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useAction } from "@/lib/use-action";

type Pausa = {
  id: string;
  /** `meta_connection`: la cuenta de Meta; `channel`: la conexión manual o de WhatsApp Web. */
  tipo: "meta_connection" | "channel";
  pausada: boolean;
  textoConfirmacion: string;
};

function usePausar({ id, tipo, pausada, textoConfirmacion }: Pausa) {
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
  return { alternar, pending };
}

/** Pausar o reanudar desde el menú de una fila de la lista. */
export function MenuPausar({ nombre, ...pausa }: Pausa & { nombre: string }) {
  const { alternar, pending } = usePausar(pausa);
  return (
    <MenuDeFila etiqueta={`Más acciones de ${nombre}`}>
      <DropdownMenuItem icon={pausa.pausada ? <Play /> : <Pause />} disabled={pending} onSelect={() => void alternar()}>
        {pausa.pausada ? "Reanudar" : "Pausar"}
      </DropdownMenuItem>
    </MenuDeFila>
  );
}

/**
 * Pausar o reanudar desde la consola (HU-AOS-23). La cuenta de Meta (ADR-0122) o una conexión
 * manual o de WhatsApp Web (adenda 2026-10-19): las dos detienen la entrada y la salida. Reusa
 * el BFF de acciones de conexiones, que el backend audita (`connection.paused` / `resumed`).
 */
export function PausarConexion(pausa: Pausa) {
  const { alternar, pending } = usePausar(pausa);
  const { pausada } = pausa;

  return (
    <Button variant="outline" onClick={() => void alternar()} loading={pending}>
      {pausada ? "Reanudar" : "Pausar"}
    </Button>
  );
}
