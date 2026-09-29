"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";

/** Optimiza el trayecto del día (vecino más cercano) y guarda el plan. */
export function RouteOptimizeButton({ portfolioId }: { portfolioId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  async function optimizar() {
    setStatus({ loading: true });
    const res = await fetch(`/api/pack/cobranza/portfolios/${portfolioId}/route/optimize`, {
      method: "POST",
    });
    const json = (await res.json().catch(() => ({}))) as {
      distancia_km?: number;
      tiempo_min?: number;
      error?: string;
    };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo optimizar el trayecto." });
      return;
    }
    setStatus({
      success: `Ruta optimizada: ${json.distancia_km ?? 0} km · ${json.tiempo_min ?? 0} min.`,
    });
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button disabled={status.loading} onClick={optimizar} size="sm" variant="outline">
        {status.loading ? "Optimizando…" : "Optimizar ruta"}
      </Button>
      <FormFeedback error={status.error} success={status.success} />
    </div>
  );
}
