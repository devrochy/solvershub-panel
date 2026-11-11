"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";

/** Re-encola un evento de la bandeja de fallos. */
export function RetryButton({ entryId, que }: { entryId: string; /** Qué se reintenta, para el nombre accesible. */ que?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function reintentar() {
    setLoading(true);
    setError(undefined);
    const res = await fetch(`/api/dlq/${encodeURIComponent(entryId)}`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "No se pudo reintentar.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button aria-label={que ? `Reintentar ${que}` : undefined} loading={loading} onClick={reintentar} size="sm" variant="outline">
        Reintentar
      </Button>
      <FormFeedback error={error} className="text-xs" />
    </div>
  );
}
