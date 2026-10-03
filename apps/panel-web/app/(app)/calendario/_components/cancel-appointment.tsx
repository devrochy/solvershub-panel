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
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pack/calendar/appointments/${appointmentId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        // Antes no se revisaba `res.ok`: una cancelación fallida se veía como
        // exitosa (HU-UI-01).
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(json?.error ?? "No se pudo cancelar la cita.");
        return;
      }
      router.refresh();
    } catch {
      setError("No se pudo contactar el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => void cancel()}
        disabled={loading}
        aria-label={`Cancelar cita ${label}`}
      >
        {loading ? "Cancelando…" : "Cancelar"}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
