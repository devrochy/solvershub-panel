import Link from "next/link";
import { redirect } from "next/navigation";

import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { MetaCosts } from "@/components/domain/meta-costs";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { KpiTile } from "@/components/ui/kpi-tile";
import { apiFetch } from "@/lib/api/server";
import type { CostsResponse, Me } from "@/lib/api/types";
import { enlaceSaludMeta } from "@/lib/conexion-ficha";
import { categoriaDeMeta, cuandoFueCosto, paisDeMeta } from "@/lib/costos";
import { formatLatency, formatNumber, formatUsd } from "@/lib/format";

export const metadata = { title: "Costos técnicos" };

type ModelRow = CostsResponse["by_model"][number];
type ConversationRow = CostsResponse["by_conversation"][number];
type AgentRow = CostsResponse["by_agent"][number];
type MetaRow = NonNullable<CostsResponse["meta"]>["by_category_country"][number];

const pct = (n: number) => `${n.toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`;

/**
 * Plataforma › Costos técnicos (rediseño B de Consumo y plan, CYP-07 a 10): lo que el negocio activo
 * cuesta en dólares (IA por agente y por modelo, WhatsApp por categoría). Es del equipo de SolversHub:
 * el dueño ve su consumo en créditos en Consumo y plan, y quien no es master vuelve allí.
 */
export default async function CostsPage() {
  const me = await apiFetch<Me>("/admin/me");
  if (!me.ok || me.data.role !== "master") redirect("/plan");

  const [res, metaRes] = await Promise.all([
    apiFetch<CostsResponse>("/admin/costs"),
    apiFetch<{ connections: { id: string; label: string | null; channel: string; business_id: string | null }[] }>(
      "/admin/costs/meta/credits",
    ),
  ]);
  const header = (
    <PageHeader
      title="Costos técnicos"
      description={`Lo que cuesta ${me.data.tenant?.name ? `«${me.data.tenant.name}»` : "el negocio activo"} en dólares: la IA y WhatsApp, en los últimos 30 días.`}
      helpSection="costs"
    />
  );
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorDeCarga titulo="No pudimos cargar los costos" detalle={res.error} />
      </div>
    );
  }
  const d = res.data;
  const metaConnections = metaRes.ok ? metaRes.data.connections : [];

  const agentColumns: Column<AgentRow>[] = [
    {
      key: "agente",
      header: "Agente",
      cell: (row) => (row.agent_name ? <span className="text-headline">{row.agent_name}</span> : <span className="text-text-soft">Sin agente</span>),
    },
    { key: "turnos", header: "Respuestas", align: "right", cell: (row) => <span className="text-body">{formatNumber(row.turns)}</span> },
    { key: "entrada", header: "Tokens de entrada", align: "right", cell: (row) => <span className="text-body">{formatNumber(row.tokens_in)}</span> },
    {
      key: "cache",
      header: "Desde caché",
      align: "right",
      cell: (row) =>
        row.cached_pct === null ? (
          <span className="text-text-soft" title="Sin consumo medido desde el 27 de octubre de 2026">—</span>
        ) : (
          <span className="text-body">{pct(row.cached_pct)}</span>
        ),
    },
    { key: "costo", header: "Costo", align: "right", cell: (row) => <span className="font-medium text-headline">{formatUsd(row.cost, 2)}</span> },
  ];

  const modelColumns: Column<ModelRow>[] = [
    { key: "modelo", header: "Modelo", cell: (row) => <span className="font-mono text-xs">{row.model}</span> },
    { key: "llamadas", header: "Llamadas", align: "right", cell: (row) => <span className="text-body">{formatNumber(row.calls)}</span> },
    { key: "entrada", header: "Tokens de entrada", align: "right", cell: (row) => <span className="text-body">{formatNumber(row.tokens_in)}</span> },
    { key: "salida", header: "Tokens de salida", align: "right", cell: (row) => <span className="text-body">{formatNumber(row.tokens_out)}</span> },
    { key: "latencia", header: "Latencia media", align: "right", cell: (row) => <span className="text-body">{formatLatency(row.avg_latency)}</span> },
    { key: "costo", header: "Costo", align: "right", cell: (row) => <span className="font-medium text-headline">{formatUsd(row.cost, 2)}</span> },
  ];

  // CYP-09: cada conversación cara abre su chat; el id queda en el enlace, no a la vista.
  const conversationColumns: Column<ConversationRow>[] = [
    { key: "cuando", header: "Conversación", cell: (row) => <span className="text-headline">{cuandoFueCosto(row.last)}</span> },
    { key: "turnos", header: "Respuestas", align: "right", cell: (row) => <span className="text-body">{formatNumber(row.turns)}</span> },
    { key: "costo", header: "Costo", align: "right", cell: (row) => <span className="font-medium text-headline">{formatUsd(row.cost, 2)}</span> },
  ];

  // CYP-10: categorías de Meta en español y el país con su nombre.
  const metaColumns: Column<MetaRow>[] = [
    { key: "categoria", header: "Categoría", cell: (r) => <span className="text-headline">{categoriaDeMeta(r.category)}</span> },
    { key: "pais", header: "País", cell: (r) => <span className="text-body">{paisDeMeta(r.country)}</span> },
    { key: "volumen", header: "Mensajes", align: "right", cell: (r) => <span className="text-body">{formatNumber(r.volume)}</span> },
    { key: "costo", header: "Costo", align: "right", cell: (r) => <span className="font-medium text-headline">{formatUsd(r.cost, 2)}</span> },
  ];
  const hrefChat = (row: ConversationRow) => `/conversaciones?c=${encodeURIComponent(row.conversation_id)}`;

  return (
    <div className="flex flex-col gap-6">
      {header}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiTile label="Últimos 30 días" value={formatUsd(d.month, 2)} hint="IA del negocio" />
        <KpiTile label="Hoy" value={formatUsd(d.today, 2)} />
        <KpiTile label="Respuestas" value={formatNumber(d.total_turns)} hint={d.total_turns > 0 ? `${formatUsd(d.month / d.total_turns, 4)} cada una` : undefined} />
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="por-agente">
        <h2 id="por-agente" className="font-display text-lg font-semibold text-headline">
          Por agente
        </h2>
        <TablaResponsiva
          etiqueta="Costo por agente"
          columns={agentColumns}
          rows={d.by_agent}
          getRowKey={(row) => row.agent_id ?? "sin-agente"}
          emptyTitle="Sin consumo por agente"
          filaCelular={(row) => ({
            titulo: row.agent_name ?? "Sin agente",
            detalle: `${formatNumber(row.turns)} respuestas${row.cached_pct === null ? "" : ` · ${pct(row.cached_pct)} desde caché`}`,
            fin: formatUsd(row.cost, 2),
          })}
        />
        <p className="text-xs text-text-soft">«Desde caché» es la parte de la entrada que el proveedor cobró más barata porque ya la había visto. Se mide desde el 27 de octubre de 2026.</p>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="conversaciones-caras">
        <h2 id="conversaciones-caras" className="font-display text-lg font-semibold text-headline">
          Conversaciones que más costaron
        </h2>
        <TablaResponsiva
          etiqueta="Conversaciones que más costaron"
          columns={conversationColumns}
          rows={d.by_conversation}
          getRowKey={(row) => row.conversation_id}
          getRowHref={hrefChat}
          getRowLabel={(row) => `Abrir la conversación (${cuandoFueCosto(row.last).toLowerCase()})`}
          emptyTitle="Sin conversaciones con costo"
          filaCelular={(row) => ({ titulo: cuandoFueCosto(row.last), detalle: `${formatNumber(row.turns)} respuestas`, fin: formatUsd(row.cost, 2), href: hrefChat(row) })}
        />
      </section>

      {d.meta && (
        <section className="flex flex-col gap-3" aria-labelledby="whatsapp">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="whatsapp" className="font-display text-lg font-semibold text-headline">
              WhatsApp (Meta)
            </h2>
            <Link href={enlaceSaludMeta(metaConnections.map((c) => c.id))} className="text-sm text-link hover:underline">
              Salud de Meta
            </Link>
          </div>
          <TablaResponsiva
            etiqueta="Costo de WhatsApp por categoría"
            columns={metaColumns}
            rows={d.meta.by_category_country}
            getRowKey={(r, i) => `${r.category}-${r.country}-${i}`}
            emptyTitle="Sin consumo de Meta"
            filaCelular={(r) => ({ titulo: categoriaDeMeta(r.category), detalle: `${formatNumber(r.volume)} mensajes · ${paisDeMeta(r.country)}`, fin: formatUsd(r.cost, 2) })}
          />
          <p className="text-xs text-text-soft">
            Desde el 1 de octubre de 2026 Meta cobra los mensajes de servicio y las plantillas de utilidad dentro de la ventana de 24 horas.
            {d.meta.service_allowance_hypothesis && " Puede haber una franquicia de mensajes de servicio sin confirmar: el volumen puede ser mayor que lo cobrado."}
          </p>
        </section>
      )}

      <details className="group rounded-lg border border-border-soft bg-surface">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-headline focus-visible:outline-2 focus-visible:outline-focus">
          Detalle técnico: modelos, números y comparación con Meta
        </summary>
        <div className="flex flex-col gap-6 border-t border-border-soft p-4">
          <section className="flex flex-col gap-3" aria-labelledby="por-modelo">
            <h3 id="por-modelo" className="text-sm font-medium text-headline">
              Por modelo
            </h3>
            <TablaResponsiva
              etiqueta="Costo por modelo"
              columns={modelColumns}
              rows={d.by_model}
              getRowKey={(row) => row.model}
              emptyTitle="Sin consumo registrado"
              filaCelular={(row) => ({ titulo: row.model, detalle: `${formatNumber(row.calls)} llamadas · ${formatLatency(row.avg_latency)}`, fin: formatUsd(row.cost, 2) })}
            />
          </section>
          {d.meta && d.meta.by_phone.length > 0 && (
            <section className="flex flex-col gap-3" aria-labelledby="por-numero">
              <h3 id="por-numero" className="text-sm font-medium text-headline">
                WhatsApp por número
              </h3>
              <TablaResponsiva
                etiqueta="Costo de WhatsApp por número"
                columns={[
                  { key: "numero", header: "Número", cell: (r) => <span className="tabular-nums text-headline">{r.phone_number}</span> },
                  { key: "volumen", header: "Mensajes", align: "right", cell: (r) => <span className="text-body">{formatNumber(r.volume)}</span> },
                  { key: "costo", header: "Costo", align: "right", cell: (r) => formatUsd(r.cost, 2) },
                ]}
                rows={d.meta.by_phone}
                getRowKey={(r, i) => `${r.phone_number}-${i}`}
                emptyTitle="Sin consumo por número"
                filaCelular={(r) => ({ titulo: r.phone_number, detalle: `${formatNumber(r.volume)} mensajes`, fin: formatUsd(r.cost, 2) })}
              />
            </section>
          )}
          {d.meta && d.meta.discrepancy.length > 0 && (
            <section className="flex flex-col gap-3" aria-labelledby="comparacion">
              <h3 id="comparacion" className="text-sm font-medium text-headline">
                Lo que avisó el webhook frente a lo que cobró Meta (mensajes)
              </h3>
              <TablaResponsiva
                etiqueta="Comparación con Meta"
                columns={[
                  { key: "categoria", header: "Categoría", cell: (r) => categoriaDeMeta(r.category) },
                  { key: "webhook", header: "Webhook", align: "right", cell: (r) => <span className="text-body">{formatNumber(r.webhook_count)}</span> },
                  { key: "meta", header: "Meta", align: "right", cell: (r) => <span className="text-body">{formatNumber(r.pricing_volume)}</span> },
                  {
                    key: "diff",
                    header: "Diferencia",
                    align: "right",
                    cell: (r) => (r.diff === 0 ? <Badge variant="neutral">Igual</Badge> : <Badge variant="danger">{r.diff > 0 ? `+${formatNumber(r.diff)}` : formatNumber(r.diff)}</Badge>),
                  },
                ]}
                rows={d.meta.discrepancy}
                getRowKey={(r) => r.category}
                emptyTitle="Sin datos para comparar"
                filaCelular={(r) => ({ titulo: categoriaDeMeta(r.category), detalle: `Webhook ${formatNumber(r.webhook_count)} · Meta ${formatNumber(r.pricing_volume)}`, fin: r.diff === 0 ? "Igual" : formatNumber(r.diff) })}
              />
            </section>
          )}
        </div>
      </details>

      <MetaCosts connections={metaConnections} />
    </div>
  );
}
