"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm";
import { Switch } from "@/components/ui/switch";
import type { CollaboratorItem } from "@/lib/api/types";
import { useAction } from "@/lib/use-action";

/**
 * Estado de un colaborador como interruptor (sección Equipo). El cambio es optimista: el
 * interruptor se mueve al instante y, si la API falla, vuelve solo. Desactivar pide
 * confirmación porque corta el acceso y libera el cupo del plan. Las cuentas que la sesión
 * no puede gestionar (o uno mismo) se muestran como distintivo de solo lectura.
 */
export function EstadoDeColaborador({
  collaborator,
  puedeActuar,
}: {
  collaborator: CollaboratorItem;
  puedeActuar: boolean;
}) {
  const confirm = useConfirm();
  const { run, pending } = useAction();
  const [activo, setActivo] = useState(collaborator.active);

  async function alternar(nuevo: boolean) {
    if (!nuevo) {
      const aceptado = await confirm({
        title: "Desactivar colaborador",
        description:
          "Quedará sin acceso al panel y sus permisos dejarán de aplicar hasta que lo reactives. Libera su cupo de colaboradores del plan; para reactivarlo necesitarás cupo.",
        confirmLabel: "Desactivar",
        destructive: true,
      });
      if (!aceptado) return;
    }
    setActivo(nuevo);
    const exito = await run(async () => {
      const res = await fetch(`/api/collaborators/${collaborator.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle" }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        ok: res.ok,
        status: res.status,
        error: json.error,
        success: nuevo ? "Colaborador activado." : "Colaborador desactivado.",
      };
    });
    if (!exito) setActivo(!nuevo);
  }

  if (!puedeActuar || collaborator.is_self) {
    return (
      <Badge variant={collaborator.active ? "success" : "danger"}>
        {collaborator.active ? "Activa" : "Inactiva"}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <Switch
        checked={activo}
        onCheckedChange={(v) => void alternar(v)}
        disabled={pending}
        tone="success"
        aria-label={`${activo ? "Desactivar" : "Activar"} a ${collaborator.nombre || collaborator.email}`}
      />
      <span
        className={
          activo
            ? "inline-flex items-center gap-1.5 text-sm text-status-success-fg"
            : "inline-flex items-center gap-1.5 text-sm text-text-soft"
        }
      >
        <span
          aria-hidden
          className={
            activo
              ? "h-1.5 w-1.5 rounded-full bg-status-success-fg"
              : "h-1.5 w-1.5 rounded-full bg-text-soft"
          }
        />
        {activo ? "Activa" : "Inactiva"}
      </span>
    </div>
  );
}
