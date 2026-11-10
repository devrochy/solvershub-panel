"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormFeedback } from "@/components/ui/form-feedback";

type Connection = {
  id: string;
  label: string | null;
  channel: string;
  business_id: string | null;
};

type CreditsResult = { credits: Record<string, unknown>[]; error: string | null };

/** Costos de WhatsApp (Meta): sincronizar precios y consultar créditos. */
export function MetaCosts({ connections }: { connections: Connection[] }) {
  const [status, setStatus] = useState<{ loading?: string; error?: string; success?: string }>({});
  const [result, setResult] = useState<CreditsResult | null>(null);

  async function sync() {
    setStatus({ loading: "sync" });
    const res = await fetch("/api/costs/meta/sync", { method: "POST" });
    const json = (await res.json().catch(() => ({}))) as { errors?: string[]; error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo sincronizar." });
      return;
    }
    setStatus({
      success: json.errors?.length ? `Con avisos: ${json.errors.join("; ")}` : "Costos sincronizados.",
      error: undefined,
    });
  }

  async function verify(connectionId: string) {
    setStatus({ loading: connectionId });
    setResult(null);
    const res = await fetch(`/api/costs/meta/credits/${connectionId}`, { method: "POST" });
    const json = (await res.json().catch(() => ({}))) as
      | (CreditsResult & { error?: string })
      | null;
    if (!res.ok || !json) {
      setStatus({ error: json?.error ?? "No se pudieron consultar los créditos." });
      return;
    }
    setStatus({});
    setResult({ credits: json.credits ?? [], error: json.error ?? null });
  }

  const negocio = connections.find((c) => c.business_id)?.business_id;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle as="h3">Créditos y pago en Meta</CardTitle>
          <Button variant="ghost" onClick={() => void sync()} loading={status.loading === "sync"} disabled={Boolean(status.loading)}>
            Traer costos de Meta
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FormFeedback error={status.error} success={status.success} />

        {connections.length === 0 ? (
          <EmptyState
            title="Sin cuentas de WhatsApp Business"
            description="Cuando conectes WhatsApp Business verás aquí sus créditos con Meta."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border-soft">
            {connections.map((connection) => (
              <li key={connection.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="text-sm text-headline">{connection.label ?? "Cuenta de WhatsApp Business"}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void verify(connection.id)}
                  loading={status.loading === connection.id}
                  disabled={Boolean(status.loading)}
                >
                  Consultar créditos
                </Button>
              </li>
            ))}
          </ul>
        )}

        {result?.error && <p className="text-sm text-status-danger-fg">{result.error}</p>}
        {result && !result.error && (
          <div className="rounded-md border border-border-soft bg-bg-deep p-3">
            {result.credits.length === 0 ? (
              <p className="text-sm text-text-soft">Meta no tiene líneas de crédito para esta cuenta.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border-soft text-sm">
                {result.credits.map((linea, indice) => (
                  <li key={String(linea.id ?? indice)} className="flex flex-wrap justify-between gap-2 py-2">
                    <span className="text-headline">{String(linea.legal_entity_name ?? "Línea de crédito")}</span>
                    <span className="text-text-soft">{String(linea.currency ?? "Sin moneda")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border-soft p-3">
          <p className="max-w-prose text-sm text-body">
            El saldo y el método de pago se manejan en Business Manager de Meta: desde aquí solo se consultan.
          </p>
          <Button asChild size="sm" variant="outline">
            <a href={`https://business.facebook.com/${negocio ? `?business_id=${negocio}` : ""}`} rel="noreferrer" target="_blank">
              Abrir Business Manager
              <ExternalLink className="h-4 w-4" aria-hidden />
              <span className="sr-only">(se abre en otra pestaña)</span>
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
