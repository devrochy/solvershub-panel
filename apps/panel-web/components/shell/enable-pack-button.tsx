"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * CTA para habilitar un pack desde el menú (mismo endpoint que la página de
 * Habilidades). Si el pack exige configuración, se entra a configurarlo antes:
 * activarlo sin config dejaría el pack "a medias".
 */
export function EnablePackButton({
  pluginId,
  label,
  hasConfig,
}: {
  pluginId: string;
  label: string;
  hasConfig: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  if (hasConfig) {
    return (
      <Button asChild size="sm" variant="outline">
        <Link href={`/habilidades/${pluginId}`}>Configurar y habilitar</Link>
      </Button>
    );
  }

  async function activate() {
    setLoading(true);
    setError(undefined);
    const res = await fetch(`/api/plugins/${encodeURIComponent(pluginId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "activate" }),
    });
    setLoading(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "No se pudo habilitar el pack.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <Button disabled={loading} onClick={activate} size="sm" variant="outline">
        {loading ? "Habilitando…" : `Habilitar ${label}`}
      </Button>
      {error && (
        <span className="text-xs text-status-danger-fg" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
