import Link from "next/link";

import { MetaCosts } from "@/app/(app)/costos/_components/meta-costs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { apiFetch } from "@/lib/api/server";
import type { CostsResponse } from "@/lib/api/types";
import { formatDateTime, formatLatency, formatNumber, formatUsd } from "@/lib/format";

export const metadata = { title: "Costos LLM" };

type ModelRow = CostsResponse["by_model"][number];
type ConversationRow = CostsResponse["by_conversation"][number];

export default async function CostsPage() {
  const [res, metaRes] = await Promise.all([
    apiFetch<CostsResponse>("/admin/costs"),
    apiFetch<{ connections: { id: string; label: string | null; channel: string; business_id: string | null }[] }>(
      "/admin/costs/meta/credits",
    ),
  ]);
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar los costos: {res.error}
      </p>
    );
  }
  const d = res.data;
  const metaConnections = metaRes.ok ? metaRes.data.connections : [];

  const modelColumns: Column<ModelRow>[] = [
    { key: "modelo", header: "Modelo", cell: (row) => <span className="font-mono text-xs">{row.model}</span> },
    { key: "llamadas", header: "Llamadas", align: "right", cell: (row) => <span className="text-body">{formatNumber(row.calls)}</span> },
    { key: "entrada", header: "Tokens entrada", align: "right", cell: (row) => <span className="text-body">{formatNumber(row.tokens_in)}</span> },
    { key: "salida", header: "Tokens salida", align: "right", cell: (row) => <span className="text-body">{formatNumber(row.tokens_out)}</span> },
    { key: "latencia", header: "Latencia media", align: "right", cell: (row) => <span className="text-body">{formatLatency(row.avg_latency)}</span> },
    { key: "costo", header: "Costo", align: "right", cell: (row) => formatUsd(row.cost) },
  ];

  const conversationColumns: Column<ConversationRow>[] = [
    { key: "id", header: "Conversación", cell: (row) => <span className="font-mono text-xs">{row.conversation_id}</span> },
    { key: "turnos", header: "Turnos", align: "right", cell: (row) => <span className="text-body">{formatNumber(row.turns)}</span> },
    { key: "costo", header: "Costo", align: "right", cell: (row) => formatUsd(row.cost) },
    { key: "ultimo", header: "Último uso", cell: (row) => <span className="text-body">{formatDateTime(row.last)}</span> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Costos LLM" description="Consumo del agente por modelo y conversación."   helpSection="costs"
        />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Costo hoy" value={formatUsd(d.today)} tone="accent" />
        <StatCard label="Costo (30 días)" value={formatUsd(d.month)} tone="accent" />
        <StatCard label="Turnos totales" value={formatNumber(d.total_turns)} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">Por modelo (30 días)</h2>
        <DataTable
          columns={modelColumns}
          rows={d.by_model}
          getRowKey={(row) => row.model}
          emptyTitle="Sin consumo registrado"
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">
          Conversaciones más costosas (30 días)
        </h2>
        <DataTable
          columns={conversationColumns}
          rows={d.by_conversation}
          getRowKey={(row) => row.conversation_id}
          emptyTitle="Sin conversaciones con costo"
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-headline">
            Cambios de facturación de Meta
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/conexiones/meta">Salud de Meta →</Link>
          </Button>
        </div>
        <div className="rounded-lg border border-border-soft bg-bg-deep p-4 text-sm text-body">
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>
              <strong>Desde el 1 de agosto de 2026:</strong> los mensajes de Meta Business Agent se
              facturan <strong>por token</strong> (2,00 USD por millón de tokens, ~4-5 centavos por
              mensaje) — categoría separada, no se mezcla con plantillas. Sin ingesta automática
              todavía: informativo.
            </li>
            <li>
              <strong>Desde el 1 de octubre de 2026:</strong> Meta cobra los <strong>mensajes de
              servicio</strong> y las plantillas <strong>utility</strong> enviadas dentro de la
              ventana abierta de 24h, a las tarifas de utility/authentication por mercado — sin
              tiers de volumen para servicio.
            </li>
          </ul>
          <p className="mt-2 text-xs text-text-soft">
            No hay franquicia de mensajes gratis confirmada oficialmente por Meta para servicio o
            utility dentro de la ventana. Sigue siendo gratis la ventana de free entry point de 72h
            (Click to WhatsApp Ads / botones CTA de Página).
          </p>
        </div>
      </section>

      {d.meta && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold text-headline">
            Costos de WhatsApp (Meta, 30 días)
          </h2>
          {d.meta.service_allowance_hypothesis && (
            <p className="text-xs text-text-soft">
              Hay una hipótesis de franquicia de mensajes de servicio activa: el volumen puede
              superar lo facturable.
            </p>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <DataTable
              columns={[
                { key: "categoria", header: "Categoría", cell: (r) => r.category },
                { key: "pais", header: "País", cell: (r) => <span className="text-body">{r.country}</span> },
                { key: "volumen", header: "Volumen", align: "right", cell: (r) => <span className="text-body">{formatNumber(r.volume)}</span> },
                { key: "costo", header: "Costo", align: "right", cell: (r) => formatUsd(r.cost) },
              ]}
              rows={d.meta.by_category_country}
              getRowKey={(r, i) => `${r.category}-${r.country}-${i}`}
              emptyTitle="Sin consumo de Meta"
            />
            <DataTable
              columns={[
                { key: "numero", header: "Número", cell: (r) => <span className="font-mono text-xs">{r.phone_number}</span> },
                { key: "volumen", header: "Volumen", align: "right", cell: (r) => <span className="text-body">{formatNumber(r.volume)}</span> },
                { key: "costo", header: "Costo", align: "right", cell: (r) => formatUsd(r.cost) },
              ]}
              rows={d.meta.by_phone}
              getRowKey={(r, i) => `${r.phone_number}-${i}`}
              emptyTitle="Sin consumo por número"
            />
          </div>
          {d.meta.discrepancy.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-body">
                Comparación <strong>webhook</strong> vs <strong>pricing de Meta</strong> (volumen,
                no dólares). Las filas marcadas indican diferencias a revisar:
              </p>
              <DataTable
                columns={[
                  { key: "categoria", header: "Categoría", cell: (r) => r.category },
                  { key: "webhook", header: "Webhook", align: "right", cell: (r) => <span className="text-body">{formatNumber(r.webhook_count)}</span> },
                  { key: "pricing", header: "Pricing Meta", align: "right", cell: (r) => <span className="text-body">{formatNumber(r.pricing_volume)}</span> },
                  {
                    key: "diff",
                    header: "Diferencia",
                    align: "right",
                    cell: (r) =>
                      r.diff === 0 ? (
                        <Badge variant="neutral">0</Badge>
                      ) : (
                        <Badge variant="danger">{r.diff > 0 ? `+${r.diff}` : r.diff}</Badge>
                      ),
                  },
                ]}
                rows={d.meta.discrepancy}
                getRowKey={(r) => r.category}
                emptyTitle="Sin datos para comparar"
              />
            </div>
          )}
        </section>
      )}

      <MetaCosts connections={metaConnections} />
    </div>
  );
}
