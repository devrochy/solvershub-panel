"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";

/** Inicia la suscripción a un plan y redirige al checkout del proveedor. */
export function SubscribeButton({ planId }: { planId: string }) {
  const [state, setState] = useState<{ loading?: boolean; error?: string }>({});

  async function subscribe() {
    setState({ loading: true });
    const res = await fetch("/api/plan/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_id: planId }),
    });
    const json = (await res.json().catch(() => ({}))) as { checkout_url?: string; error?: string };
    if (!res.ok || !json.checkout_url) {
      setState({ error: json.error ?? "No se pudo iniciar el pago." });
      return;
    }
    window.location.href = json.checkout_url;
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" size="sm" onClick={() => void subscribe()} disabled={state.loading}>
        {state.loading ? "Abriendo pago…" : "Suscribir"}
      </Button>
      <FormFeedback error={state.error} />
    </div>
  );
}
