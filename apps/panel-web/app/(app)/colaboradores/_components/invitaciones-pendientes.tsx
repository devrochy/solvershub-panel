"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { rolLabel } from "@/lib/labels";
import { useAction } from "@/lib/use-action";

export type InvitacionPendiente = { id: string; email: string; rol: string; creadaEn: string | null };

/** Invitaciones pendientes enviadas por el negocio, con opción de revocarlas (HU-UI-14). */
export function InvitacionesPendientes({ invitaciones }: { invitaciones: InvitacionPendiente[] }) {
  const [visibles, setVisibles] = useState(invitaciones);
  const confirm = useConfirm();
  const { run, pending } = useAction();

  async function revocar(inv: InvitacionPendiente) {
    const aceptado = await confirm({
      title: "Revocar invitación",
      description: `El enlace de ${inv.email} deja de valer y no podrá aceptar la invitación. Para volver a invitarlo tendrás que enviársela de nuevo.`,
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
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-headline">Invitaciones pendientes</h2>
      <ul className="flex flex-col gap-2">
        {visibles.map((inv) => (
          <li
            key={inv.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border-soft px-3 py-2 text-sm"
          >
            <span className="text-body">
              {inv.email} · <span className="text-text-soft">{rolLabel(inv.rol)}</span>
            </span>
            <Button variant="outline" size="sm" onClick={() => void revocar(inv)} disabled={pending}>
              Revocar
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
