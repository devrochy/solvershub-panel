"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";

/**
 * Registra (o re-registra) la suscripción de la APP de una conexión (HU-CONN-05). Sin permiso
 * (la app de la plataforma, si no eres admin de plataforma) no muestra el botón.
 */
export function WebhookRegister({
  connectionId,
  canRegister,
  usesPlatformApp,
}: {
  connectionId: string;
  canRegister: boolean;
  usesPlatformApp: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  if (!canRegister) {
    return (
      <p className="text-xs text-text-soft">
        {usesPlatformApp ? "SolversHub lo mantiene registrado por ti." : "Solo el propietario del negocio puede registrarlo."}
      </p>
    );
  }

  async function register() {
    setStatus({ loading: true });
    const res = await fetch("/api/meta/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connection_id: connectionId }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo registrar." });
      return;
    }
    setStatus({ success: "Webhook registrado en Meta." });
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="outline" onClick={() => void register()} loading={status.loading}>
        Registrar de nuevo en Meta
      </Button>
      <FormFeedback error={status.error} success={status.success} />
    </div>
  );
}
