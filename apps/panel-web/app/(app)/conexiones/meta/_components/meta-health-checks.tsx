"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import {
  muestraReparacion,
  nombreDelCheck,
  reparacion,
  type HealthCheck,
  type Reparacion,
} from "@/lib/meta-salud";

/** Checks del último diagnóstico, cada uno con su reparación si falla (HU-CONN-04). */
export function MetaHealthChecks({ connectionId, checks }: { connectionId: string; checks: HealthCheck[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  async function run(accion: Extract<Reparacion, { tipo: "accion" }>["accion"]) {
    setStatus({ loading: true });
    const res = await fetch(`/api/meta/health/${connectionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: accion }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo completar la reparación." });
      return;
    }
    setStatus({ success: "Listo. Diagnostica de nuevo para ver el resultado." });
    router.refresh();
  }

  if (checks.length === 0) {
    return <p className="text-xs text-text-soft">Todavía no hay diagnóstico. Pulsa «Diagnosticar».</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1.5">
        {checks.map((check) => {
          const arreglo = muestraReparacion(check) ? reparacion(check.repair_action, connectionId) : null;
          const sinDato = check.ok === null || check.ok === undefined;
          return (
            <li key={check.key} className="flex items-start justify-between gap-3 text-xs">
              <span className="flex flex-col gap-0.5">
                <span className="text-body">{nombreDelCheck(check.key)}</span>
                {check.detail && <span className="text-text-soft">{check.detail}</span>}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {arreglo?.tipo === "enlace" && (
                  <Link className="text-link underline" href={arreglo.href}>
                    {arreglo.label}
                  </Link>
                )}
                {arreglo?.tipo === "accion" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void run(arreglo.accion)}
                    disabled={status.loading}
                  >
                    {arreglo.label}
                  </Button>
                )}
                <Badge variant={sinDato ? "neutral" : check.ok ? "success" : "danger"}>
                  {sinDato ? "?" : check.ok ? "ok" : "falla"}
                </Badge>
              </span>
            </li>
          );
        })}
      </ul>
      <FormFeedback error={status.error} success={status.success} />
    </div>
  );
}
