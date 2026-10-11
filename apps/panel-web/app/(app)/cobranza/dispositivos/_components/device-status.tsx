"use client";

import { useState } from "react";
import { Ban, Check } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/** Activa o bloquea un dispositivo (ADR-0057). */
export function DeviceStatus({ deviceId, estado }: { deviceId: string; estado: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string>();
  const [error, setError] = useState<string>();

  async function cambiar(nuevo: string) {
    setLoading(nuevo);
    setError(undefined);
    const res = await fetch(`/api/pack/cobranza/devices/${deviceId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevo }),
    });
    setLoading(undefined);
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "No se pudo actualizar el dispositivo.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {estado !== "activo" && (
        <Button
          aria-label="Activar dispositivo"
          disabled={loading === "activo"}
          onClick={() => cambiar("activo")}
          size="icon"
          title="Activar dispositivo"
          variant="outline"
        >
          <Check className="h-4 w-4" aria-hidden />
        </Button>
      )}
      {estado !== "bloqueado" && (
        <Button
          aria-label="Bloquear dispositivo"
          disabled={loading === "bloqueado"}
          onClick={() => cambiar("bloqueado")}
          size="icon"
          title="Bloquear dispositivo"
          variant="ghost"
        >
          <Ban className="h-4 w-4 text-status-danger-fg" aria-hidden />
        </Button>
      )}
      {error && (
        <span className="text-xs text-status-danger-fg" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
