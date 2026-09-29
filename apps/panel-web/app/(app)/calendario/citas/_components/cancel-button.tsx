"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Cancela una cita (y su evento de Google si lo tiene). */
export function CancelAppointmentButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function cancelar() {
    setLoading(true);
    setError(undefined);
    const res = await fetch(`/api/pack/calendar/appointments/${id}/cancel`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "No se pudo cancelar.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {confirmando ? (
        <>
          <Button
            aria-label="Confirmar cancelación"
            className="text-danger"
            disabled={loading}
            onClick={cancelar}
            size="icon"
            title="Confirmar cancelación"
            variant="outline"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
          <Button onClick={() => setConfirmando(false)} size="sm" variant="ghost">
            Volver
          </Button>
        </>
      ) : (
        <Button onClick={() => setConfirmando(true)} size="sm" variant="ghost">
          Cancelar
        </Button>
      )}
      {error && (
        <span className="text-xs text-danger" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
