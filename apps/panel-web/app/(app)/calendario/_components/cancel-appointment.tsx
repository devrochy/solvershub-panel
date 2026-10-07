"use client";

import { useConfirm } from "@/components/ui/confirm";

import { Button } from "@/components/ui/button";
import { useAction } from "@/lib/use-action";

/** Cancela una cita (borra el evento de Google en best-effort y marca el espejo). */
export function CancelAppointmentButton({
  appointmentId,
  label,
}: {
  appointmentId: string;
  label: string;
}) {
  const confirm = useConfirm();
  const { run, pending } = useAction();

  async function cancel() {
    const aceptado = await confirm({
      title: "Cancelar cita",
      description:
        "Se cancelará la cita y, si tiene evento de Google, se eliminará también. Esta acción no se puede deshacer.",
      confirmLabel: "Cancelar cita",
      destructive: true,
    });
    if (!aceptado) return;
    await run(async () => {
      const res = await fetch(`/api/pack/calendar/appointments/${appointmentId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        return { ok: false, error: json?.error ?? "No se pudo cancelar la cita." };
      }
      return { ok: true, success: "Cita cancelada." };
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => void cancel()}
      disabled={pending}
      aria-label={`Cancelar cita ${label}`}
    >
      {pending ? "Cancelando…" : "Cancelar"}
    </Button>
  );
}
