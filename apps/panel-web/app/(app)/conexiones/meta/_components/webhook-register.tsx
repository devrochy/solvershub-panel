"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";

/** Registra (o re-registra) la suscripción de APP de un canal. */
export function WebhookRegister({ channel }: { channel: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  async function register() {
    setStatus({ loading: true });
    const res = await fetch("/api/meta/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo registrar." });
      return;
    }
    setStatus({ success: "Suscripción registrada." });
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" onClick={() => void register()} disabled={status.loading}>
        {status.loading ? "Registrando…" : "Registrar"}
      </Button>
      <FormFeedback error={status.error} success={status.success} />
    </div>
  );
}
