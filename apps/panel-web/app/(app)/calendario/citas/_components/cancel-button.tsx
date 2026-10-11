"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { useAction } from "@/lib/use-action";

/** Cancela una cita (y su evento de Google si lo tiene). */
export function CancelAppointmentButton({ id }: { id: string }) {
  const confirm = useConfirm();
  const { run, pending } = useAction();

  async function cancelar() {
    const aceptado = await confirm({
      title: "Cancelar cita",
      description:
        "Se cancelará la cita y, si tiene evento de Google, se eliminará también. Esta acción no se puede deshacer.",
      confirmLabel: "Cancelar cita",
      destructive: true,
    });
    if (!aceptado) return;
    await run(async () => {
      const res = await fetch(`/api/pack/calendar/appointments/${id}/cancel`, { method: "POST" });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false, error: json.error ?? "No se pudo cancelar." };
      }
      return { ok: true, success: "Cita cancelada." };
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        aria-label="Cancelar cita"
        className="text-status-danger-fg"
        disabled={pending}
        onClick={() => void cancelar()}
        size="sm"
        title="Cancelar cita"
        variant="outline"
      >
        <X className="h-4 w-4" aria-hidden />
        {pending ? "Cancelando…" : "Cancelar"}
      </Button>
    </div>
  );
}
