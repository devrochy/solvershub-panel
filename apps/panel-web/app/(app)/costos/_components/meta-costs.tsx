"use client";

import { useState } from "react";

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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>WhatsApp (Meta)</CardTitle>
          <Button variant="outline" size="sm" onClick={() => void sync()} disabled={Boolean(status.loading)}>
            {status.loading === "sync" ? "Sincronizando…" : "Sincronizar costos"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FormFeedback error={status.error} success={status.success} />

        {connections.length === 0 ? (
          <EmptyState
            title="Sin conexiones de Meta"
            description="Cuando conectes WhatsApp Business podrás ver aquí sus costos y créditos."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border-soft">
            {connections.map((connection) => (
              <li key={connection.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex flex-col">
                  <span className="text-sm text-headline">
                    {connection.label ?? connection.business_id ?? connection.channel}
                  </span>
                  <span className="font-mono text-xs text-text-soft">
                    {connection.channel} · {connection.business_id ?? "sin business_id"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void verify(connection.id)}
                  disabled={Boolean(status.loading)}
                >
                  {status.loading === connection.id ? "Consultando…" : "Verificar créditos"}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {result?.error && <p className="text-sm text-danger">{result.error}</p>}
        {result && !result.error && (
          <div className="rounded-md border border-border-soft bg-bg-deep p-3">
            {result.credits.length === 0 ? (
              <p className="text-sm text-text-soft">Sin líneas de crédito devueltas por Meta.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-text-soft">
                    <th className="py-1 pr-3 font-medium">ID</th>
                    <th className="py-1 pr-3 font-medium">Razón social</th>
                    <th className="py-1 font-medium">Moneda</th>
                  </tr>
                </thead>
                <tbody>
                  {result.credits.map((linea, indice) => (
                    <tr key={String(linea.id ?? indice)} className="border-t border-border-soft">
                      <td className="py-1 pr-3 font-mono">{String(linea.id ?? "—")}</td>
                      <td className="py-1 pr-3">{String(linea.legal_entity_name ?? "—")}</td>
                      <td className="py-1">{String(linea.currency ?? "—")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-text-soft">Datos crudos</summary>
              <pre className="mt-1 overflow-x-auto font-mono text-[11px] text-body">
                {JSON.stringify(result.credits, null, 2)}
              </pre>
            </details>
          </div>
        )}

        <div className="rounded-md border border-border-soft p-3">
          <p className="text-sm text-headline">Paso manual de facturación</p>
          <p className="mt-1 text-xs text-body">
            Meta solo permite <strong>leer</strong> las líneas de crédito
            (<code>GET /&#123;business_id&#125;/extendedcredits</code>): no hay API para crear ni
            actualizar saldo. La recarga se hace a mano en Business Manager → WhatsApp Manager /
            Business Settings → Facturación.
          </p>
          <Button asChild className="mt-2" size="sm" variant="outline">
            <a
              href={`https://business.facebook.com/${
                connections.find((c) => c.business_id)?.business_id
                  ? `?business_id=${connections.find((c) => c.business_id)?.business_id}`
                  : ""
              }`}
              rel="noreferrer"
              target="_blank"
            >
              Abrir Business Manager ↗
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
