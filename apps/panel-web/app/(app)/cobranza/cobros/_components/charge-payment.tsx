"use client";

import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Registra el pago recibido del propietario para un período. */
export function ChargePayment({ chargeId }: { chargeId: string }) {
  const router = useRouter();
  const [valor, setValor] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);
    const res = await fetch(`/api/pack/cobranza/owner-charges/${chargeId}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto_pagado: Number(valor) }),
    });
    setLoading(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "No se pudo registrar el pago.");
      return;
    }
    setValor("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center justify-end gap-2">
      <Input
        aria-label="Monto pagado"
        className="h-8 w-28"
        min={1}
        onChange={(e) => setValor(e.target.value)}
        placeholder="Monto"
        required
        type="number"
        value={valor}
      />
      <Button
        aria-label="Registrar pago"
        disabled={loading}
        size="icon"
        title="Registrar pago"
        type="submit"
        variant="outline"
      >
        <Check className="h-4 w-4" aria-hidden />
      </Button>
      {error && (
        <span className="text-xs text-status-danger-fg" role="alert">
          {error}
        </span>
      )}
    </form>
  );
}
