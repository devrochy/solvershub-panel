"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/** Cancela una cita (borra el evento de Google en best-effort y marca el espejo). */
export function CancelAppointmentButton({
  appointmentId,
  label,
}: {
  appointmentId: string;
  label: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function cancel() {
    setLoading(true);
    await fetch(`/api/pack/calendar/appointments/${appointmentId}/cancel`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => void cancel()}
      disabled={loading}
      aria-label={`Cancelar cita ${label}`}
    >
      {loading ? "Cancelando…" : "Cancelar"}
    </Button>
  );
}
