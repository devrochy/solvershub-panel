"use client";

import { Pause, Play, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import type { SuscripcionDetalle } from "@/lib/api/types";
import {
  ACCION_LABEL,
  confirmacionDeAccion,
  type AccionSuscripcion,
} from "@/lib/suscripciones-admin";
import { useAction } from "@/lib/use-action";

const ICONO = { pausar: Pause, reanudar: Play, cancelar: XCircle } as const;
const EXITO: Record<AccionSuscripcion, string> = {
  pausar: "Suscripción pausada.",
  reanudar: "Suscripción reanudada.",
  cancelar: "Suscripción cancelada.",
};

/**
 * Pausar, reanudar y cancelar (HU-SUB-08). Solo se ofrecen las acciones que el servidor declara
 * válidas para el estado actual y solo a quien puede escribir: nunca un 403 por diseño.
 * Cada una pide confirmación que explica qué pasa con los cobros; el servidor la deja en la
 * auditoría con el usuario.
 */
export function AccionesSuscripcion({
  suscripcion,
  puedeEscribir,
}: {
  suscripcion: Pick<SuscripcionDetalle, "id" | "plan" | "cliente" | "acciones">;
  puedeEscribir: boolean;
}) {
  const confirm = useConfirm();
  const { run, pending } = useAction();
  const acciones = suscripcion.acciones.filter((a): a is AccionSuscripcion => a in ICONO);
  if (!puedeEscribir || acciones.length === 0) return null;

  async function ejecutar(accion: AccionSuscripcion) {
    const ok = await confirm(confirmacionDeAccion(accion, suscripcion));
    if (!ok) return;
    await run(async () => {
      const res = await fetch(`/api/pack/pack_subscriptions/suscripciones/${suscripcion.id}/${accion}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) return { ok: true, success: EXITO[accion] };
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, status: res.status, error: json.error ?? "No se pudo completar la acción." };
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Acciones de la suscripción">
      {acciones.map((accion) => {
        const Icono = ICONO[accion];
        return (
          <Button
            key={accion}
            type="button"
            variant={accion === "cancelar" ? "danger" : "outline"}
            disabled={pending}
            onClick={() => ejecutar(accion)}
          >
            <Icono className="h-4 w-4" aria-hidden />
            {ACCION_LABEL[accion]}
          </Button>
        );
      })}
    </div>
  );
}
