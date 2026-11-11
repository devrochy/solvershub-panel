"use client";

import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import type { ReenvioLinkOut } from "@/lib/api/types";
import { confirmacionDeReenvio, mensajeDeReenvio } from "@/lib/suscripciones-admin";
import { useAction } from "@/lib/use-action";

export type CargoParaAccion = { id: string; periodo: string; monto: number; moneda?: string | null };

/**
 * Reenvía al cliente el link de pago de un cobro pendiente (HU-SUB-20). Si el cliente no tiene
 * una conversación de WhatsApp el servidor no envía nada y devuelve el link: se copia al
 * portapapeles para que el negocio lo comparta por otro medio. Hook aparte para usarlo desde un
 * menú (SUS-08) sin que la acción dependa de que el menú siga abierto.
 */
export function useReenviarLink(cargo: CargoParaAccion, cliente: string) {
  const confirm = useConfirm();
  const { run, pending } = useAction({ refresh: false });

  async function reenviar() {
    const ok = await confirm(confirmacionDeReenvio(cargo, cliente));
    if (!ok) return;
    await run(async () => {
      const res = await fetch(`/api/pack/pack_subscriptions/cargos/${cargo.id}/reenviar-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false, status: res.status, error: json.error ?? "No se pudo reenviar el link." };
      }
      const r = (await res.json()) as ReenvioLinkOut;
      let mensaje = mensajeDeReenvio(r);
      if (!r.enviado && r.link) {
        try {
          await navigator.clipboard.writeText(r.link);
          mensaje += " Ya quedó copiado.";
        } catch {
          mensaje += ` Link: ${r.link}`;
        }
      }
      return { ok: true, success: mensaje };
    });
  }

  return { reenviar, pending };
}

/** El botón «Reenviar link», con el nombre del cliente para lectores de pantalla. */
export function ReenviarLink({ cargo, cliente }: { cargo: CargoParaAccion; cliente: string }) {
  const { reenviar, pending } = useReenviarLink(cargo, cliente);
  return (
    <Button type="button" variant="outline" size="sm" aria-label={`Reenviar link de pago a ${cliente}`} onClick={reenviar} disabled={pending}>
      <Send className="h-4 w-4" aria-hidden />
      Reenviar link
    </Button>
  );
}
