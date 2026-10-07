"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAction } from "@/lib/use-action";

/** Re-encola un evento de dominio fallido (outbox, ADR-0107). */
export function RetryDomainEventButton({ eventId }: { eventId: string }) {
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
      return { ok: true, success: "Evento re-encolado." };
    });
  }

  return (
    <Button
      aria-label="Reintentar"
      disabled={pending}
      onClick={() => void reintentar()}
      size="icon"
      title="Reintentar"
      variant="outline"
    >
      <RefreshCw className="h-4 w-4" aria-hidden />
    </Button>
  );
}
