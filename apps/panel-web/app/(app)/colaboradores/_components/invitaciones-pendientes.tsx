"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { formatDate } from "@/lib/format";
import { rolLabel } from "@/lib/labels";
import { useAction } from "@/lib/use-action";

export type InvitacionPendiente = { id: string; email: string; rol: string; creadaEn: string | null };

/**
 * Invitaciones que el negocio envió y nadie ha aceptado (HU-UI-14), antes de la tabla para que se
 * vean (EQU-10). Se pueden revocar.
 */
export function InvitacionesPendientes({ invitaciones }: { invitaciones: InvitacionPendiente[] }) {
  const [visibles, setVisibles] = useState(invitaciones);
  const confirm = useConfirm();
  const { run, pending } = useAction();

  async function revocar(inv: InvitacionPendiente) {
    const aceptado = await confirm({
      title: "Revocar la invitación",
      description: `El enlace de ${inv.email} deja de valer y no podrá aceptar la invitación. Para volver a invitarla tendrás que enviársela de nuevo.`,
      confirmLabel: "Revocar",
      destructive: true,
    });
    if (!aceptado) return;
    const ok = await run(async () => {
      const res = await fetch(`/api/invitations/${inv.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: res.ok, status: res.status, error: json.error, success: "Invitación revocada." };
    });
    if (ok) setVisibles((prev) => prev.filter((i) => i.id !== inv.id));
  }

  if (visibles.length === 0) return null;

  return (
    <section aria-labelledby="invitaciones-pendientes" className="overflow-hidden rounded-lg border border-border-soft bg-surface">
      <h2 id="invitaciones-pendientes" className="sr-only">
        Invitaciones pendientes
      </h2>
      <ul>
        {visibles.map((inv) => (
          <li
            key={inv.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border-soft px-4 py-3 text-sm last:border-b-0"
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium text-headline">{inv.email}</span>
              <span className="text-xs text-text-soft">
                Invitación como {rolLabel(inv.rol).toLowerCase()}
                {inv.creadaEn ? `, enviada el ${formatDate(inv.creadaEn)}` : ""}. Todavía no la acepta.
              </span>
            </span>
            <Button variant="outline" size="sm" onClick={() => void revocar(inv)} disabled={pending} aria-label={`Revocar la invitación de ${inv.email}`}>
              Revocar
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
