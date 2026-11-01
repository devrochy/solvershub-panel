"use client";

import { Power, Trash2 } from "lucide-react";

import { useConfirm } from "@/components/ui/confirm";
import { IconAction } from "@/components/ui/icon-action";
import type { PlanOut } from "@/lib/api/types";
import {
  ACCION_DE_PLAN_EXITO,
  confirmacionDeAccionDePlan,
  cuerpoConEstado,
  type AccionDePlan,
} from "@/lib/planes";
import { useAction } from "@/lib/use-action";

/**
 * Activar, desactivar y eliminar un plan (HU-SUB-31). Desactivar lo deja de ofrecer pero se puede
 * volver a activar; eliminar es el borrado lógico del servidor. En ambos, quienes ya están inscritos
 * siguen cobrándose, y la confirmación lo dice.
 */
export function AccionesDePlan({ plan }: { plan: PlanOut }) {
  const confirm = useConfirm();
  const { run, pending } = useAction();

  async function ejecutar(accion: AccionDePlan) {
    if (!(await confirm(confirmacionDeAccionDePlan(accion, plan)))) return;
    await run(async () => {
      const ruta = `/api/pack/pack_subscriptions/planes/${plan.id}`;
      const res =
        accion === "eliminar"
          ? await fetch(ruta, { method: "DELETE" })
          : await fetch(ruta, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(cuerpoConEstado(plan, accion === "activar")),
            });
      if (res.ok) return { ok: true, success: ACCION_DE_PLAN_EXITO[accion] };
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, status: res.status, error: json.error ?? "No se pudo completar la acción." };
    });
  }

  return (
    <>
      <IconAction
        label={plan.activo ? `Desactivar ${plan.nombre}` : `Activar ${plan.nombre}`}
        tone={plan.activo ? "neutro" : "aprobar"}
        onClick={() => ejecutar(plan.activo ? "desactivar" : "activar")}
        disabled={pending}
      >
        <Power className="h-4 w-4" aria-hidden />
      </IconAction>
      <IconAction label={`Eliminar ${plan.nombre}`} tone="eliminar" onClick={() => ejecutar("eliminar")} disabled={pending}>
        <Trash2 className="h-4 w-4" aria-hidden />
      </IconAction>
    </>
  );
}
