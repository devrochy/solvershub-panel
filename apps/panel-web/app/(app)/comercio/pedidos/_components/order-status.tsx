"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { FormFeedback } from "@/components/ui/form-feedback";

const STATUSES = ["abierto", "despachado", "entregado", "cancelado", "expirado"];

/** Cambia el estado de un pedido del pack de Comercio. */
export function OrderStatus({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [state, setState] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  async function save() {
    setState({ loading: true });
    const res = await fetch(`/api/pack/commerce/orders/${orderId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: value }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setState({ error: json.error ?? "No se pudo cambiar el estado." });
      return;
    }
    setState({ success: "Estado actualizado." });
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Select
          aria-label={`Estado del pedido ${orderId}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 w-36"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Button variant="outline" size="sm" onClick={() => void save()} disabled={state.loading}>
          {state.loading ? "Guardando…" : "Guardar"}
        </Button>
      </div>
      <FormFeedback error={state.error} success={state.success} />
    </div>
  );
}
