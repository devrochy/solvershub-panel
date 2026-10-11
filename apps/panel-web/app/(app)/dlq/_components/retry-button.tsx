"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Re-encola un evento de la bandeja de fallos. */
export function RetryButton({ entryId }: { entryId: string }) {
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
      <Button
        aria-label="Reintentar"
        disabled={loading}
        onClick={reintentar}
        size="icon"
        title="Reintentar"
        variant="outline"
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
      </Button>
      {error && (
        <span className="text-xs text-status-danger-fg" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
