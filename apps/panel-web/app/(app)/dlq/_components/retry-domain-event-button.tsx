"use client";

import { Button } from "@/components/ui/button";
import { useAction } from "@/lib/use-action";

/** Re-encola un aviso del sistema que no salió (outbox, ADR-0107). */
export function RetryDomainEventButton({ eventId, que }: { eventId: string; /** Qué se reintenta, para el nombre accesible. */ que?: string }) {
  const { run, pending } = useAction();

  async function reintentar() {
    await run(async () => {
      const res = await fetch(`/api/domain-events/${encodeURIComponent(eventId)}`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false, error: json.error ?? "No se pudo reintentar." };
      }
      return { ok: true, success: "Aviso puesto otra vez en la fila." };
    });
  }

  return (
    <Button aria-label={que ? `Reintentar ${que}` : undefined} loading={pending} onClick={() => void reintentar()} size="sm" variant="outline">
      Reintentar
    </Button>
  );
}
