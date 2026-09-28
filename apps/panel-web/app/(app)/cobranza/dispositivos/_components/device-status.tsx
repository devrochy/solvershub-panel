"use client";

import { useState } from "react";
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
        <Button disabled={loading === "activo"} onClick={() => cambiar("activo")} size="sm" variant="outline">
          {loading === "activo" ? "…" : "Activar"}
        </Button>
      )}
      {estado !== "bloqueado" && (
        <Button disabled={loading === "bloqueado"} onClick={() => cambiar("bloqueado")} size="sm" variant="ghost">
          {loading === "bloqueado" ? "…" : "Bloquear"}
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
