"use client";

import { Send } from "lucide-react";

import { useConfirm } from "@/components/ui/confirm";
import { IconAction } from "@/components/ui/icon-action";
import type { ReenvioLinkOut } from "@/lib/api/types";
import { confirmacionDeReenvio, mensajeDeReenvio } from "@/lib/suscripciones-admin";
import { useAction } from "@/lib/use-action";

/**
 * Reenvía al cliente el link de pago de un cobro pendiente (HU-SUB-20). Si el cliente no tiene
 * una conversación de WhatsApp el servidor no envía nada y devuelve el link: se copia al
 * portapapeles para que el negocio lo comparta por otro medio.
 */
export function ReenviarLink({
  cargo,
  cliente,
}: {
  cargo: { id: string; periodo: string; monto: number; moneda?: string | null };
  cliente: string;
}) {
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

  return (
    <IconAction label={`Reenviar link de pago a ${cliente}`} tone="editar" onClick={reenviar} disabled={pending}>
      <Send className="h-4 w-4" aria-hidden />
    </IconAction>
  );
}
