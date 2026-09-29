"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/** Aprueba un gasto (descuenta su valor de la caja; solo una vez). */
export function ExpenseApprove({ expenseId, aprobado }: { expenseId: string; aprobado: boolean }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  if (aprobado) {
    return <span className="text-xs text-body">—</span>;
  }

  async function aprobar() {
    setLoading(true);
    setError(undefined);
    const res = await fetch(`/api/pack/cobranza/expenses/${expenseId}/approve`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "No se pudo aprobar el gasto.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {confirmando ? (
        <>
          <Button
            className="text-danger"
            disabled={loading}
            onClick={aprobar}
            size="sm"
            variant="outline"
          >
            {loading ? "…" : "Confirmar"}
          </Button>
          <Button onClick={() => setConfirmando(false)} size="sm" variant="ghost">
            Cancelar
          </Button>
        </>
      ) : (
        <Button onClick={() => setConfirmando(true)} size="sm" variant="outline">
          Aprobar
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
