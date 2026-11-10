"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { MarcaDeRevision } from "@/components/domain/marca-de-revision";
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
    setStatus({ success: "Listo. Pulsa «Revisar ahora» para confirmarlo." });
    router.refresh();
  }

  if (checks.length === 0) {
    return <p className="text-sm text-text-soft">Todavía no la revisamos. Pulsa «Revisar ahora».</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col">
        {checks.map((check) => {
          const arreglo = muestraReparacion(check) ? reparacion(check.repair_action, connectionId) : null;
          const sinDato = check.ok === null || check.ok === undefined;
          return (
            <li key={check.key} className="flex flex-wrap items-center gap-3 border-t border-border-soft py-3 text-sm first:border-t-0">
              <MarcaDeRevision ok={check.ok} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-headline">{nombreDelCheck(check.key)}</span>
                <span className="text-xs text-text-soft">
                  {sinDato ? "No se pudo revisar" : check.ok ? "Correcto" : (check.detail ?? "Hay que revisarlo")}
                </span>
              </span>
              {arreglo?.tipo === "enlace" && (
                <Button asChild variant="outline" size="sm">
                  <Link href={arreglo.href}>{arreglo.label}</Link>
                </Button>
              )}
              {arreglo?.tipo === "accion" && (
                <Button variant="outline" size="sm" onClick={() => void run(arreglo.accion)} disabled={status.loading}>
                  {arreglo.label}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <FormFeedback error={status.error} success={status.success} />
    </div>
  );
}
