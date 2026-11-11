"use client";

import { Pencil, Power, Trash2 } from "lucide-react";

import { MenuDeFila } from "@/components/domain/menu-de-fila";
import { useConfirm } from "@/components/ui/confirm";
import { DropdownMenuItem, DropdownMenuLinkItem } from "@/components/ui/dropdown-menu";
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
 * siguen cobrándose, y la confirmación lo dice. Van en «Más acciones» con «Editar» (SUS-10).
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
    <MenuDeFila etiqueta={`Más acciones de ${plan.nombre}`}>
      <DropdownMenuLinkItem href={`/suscripciones/planes?plan=${plan.id}`} scroll={false}>
        <Pencil aria-hidden className="h-4 w-4 text-text-soft" />
        Editar
      </DropdownMenuLinkItem>
      <DropdownMenuItem
        icon={<Power aria-hidden />}
        onSelect={() => void ejecutar(plan.activo ? "desactivar" : "activar")}
        disabled={pending}
      >
        {plan.activo ? "Dejar de ofrecer" : "Volver a ofrecer"}
      </DropdownMenuItem>
      <DropdownMenuItem tone="danger" icon={<Trash2 aria-hidden />} onSelect={() => void ejecutar("eliminar")} disabled={pending}>
        Eliminar plan
      </DropdownMenuItem>
    </MenuDeFila>
  );
}
