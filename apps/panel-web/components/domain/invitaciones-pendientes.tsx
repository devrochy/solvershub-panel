"use client";

import { useId, useState } from "react";
import { MailOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import type { InvitationItem } from "@/lib/api/types";
import { rolLabel } from "@/lib/labels";
import { useAction } from "@/lib/use-action";

async function resolver(id: string, action: "accept" | "reject", tenantId?: string) {
  const res = await fetch(`/api/invitations/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, tenantId }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: unknown };
  return { ok: res.ok, error: typeof json.error === "string" ? json.error : undefined };
}

/**
 * Invitaciones que esperan respuesta, al entrar al panel (HU-SH-06). Una cuenta que ya existía
 * recibe la invitación en la app (ADR-0081/0121): aceptar la deja dentro del negocio y lo pone
 * como activo; rechazar pide confirmación porque no se puede deshacer.
 */
export function InvitacionesPendientes({ items }: { items: InvitationItem[] }) {
  const confirm = useConfirm();
  const { run } = useAction();
  const [enCurso, setEnCurso] = useState<{ id: string; accion: "accept" | "reject" } | null>(null);
  const tituloId = useId();

  if (items.length === 0) return null;

  async function aceptar(invitacion: InvitationItem) {
    setEnCurso({ id: invitacion.id, accion: "accept" });
    await run(async () => {
      const r = await resolver(invitacion.id, "accept", invitacion.tenantId);
      return { ...r, success: `Ya eres parte de ${invitacion.nombre}.` };
    });
    setEnCurso(null);
  }

  async function rechazar(invitacion: InvitationItem) {
    const confirmado = await confirm({
      title: `¿Rechazar la invitación de ${invitacion.nombre}?`,
      description: "No vas a poder entrar a ese negocio, salvo que te inviten de nuevo.",
      confirmLabel: "Rechazar invitación",
      destructive: true,
    });
    if (!confirmado) return;
    setEnCurso({ id: invitacion.id, accion: "reject" });
    await run(async () => {
      const r = await resolver(invitacion.id, "reject");
      return { ...r, success: "Invitación rechazada." };
    });
    setEnCurso(null);
  }

  return (
    <section aria-labelledby={tituloId} className="mb-6 rounded-lg border border-accent/40 bg-accent/12 p-4">
      <h2 id={tituloId} className="flex items-center gap-2 text-sm font-semibold text-headline">
        <MailOpen className="h-4 w-4 text-accent" aria-hidden />
        {items.length === 1 ? "Tienes una invitación pendiente" : `Tienes ${items.length} invitaciones pendientes`}
      </h2>
      <ul className="mt-3 flex flex-col gap-3">
        {items.map((invitacion) => (
          <li key={invitacion.id} className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-body">
              <span className="font-medium text-headline">{invitacion.nombre}</span> te invitó como{" "}
              {rolLabel(invitacion.rol).toLowerCase()}.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                type="button"
                disabled={enCurso !== null}
                onClick={() => rechazar(invitacion)}
                aria-label={`Rechazar la invitación de ${invitacion.nombre}`}
              >
                {enCurso?.id === invitacion.id && enCurso.accion === "reject" ? "Rechazando…" : "Rechazar"}
              </Button>
              <Button
                size="sm"
                variant="default"
                type="button"
                disabled={enCurso !== null}
                onClick={() => aceptar(invitacion)}
                aria-label={`Aceptar la invitación de ${invitacion.nombre}`}
              >
                {enCurso?.id === invitacion.id && enCurso.accion === "accept" ? "Aceptando…" : "Aceptar"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
