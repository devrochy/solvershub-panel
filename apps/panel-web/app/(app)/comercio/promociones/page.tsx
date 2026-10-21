import {
  PromotionDialog,
  PromotionToggle,
  type Option,
  type Promotion,
} from "@/app/(app)/comercio/promociones/_components/promotion-dialog";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import type { Aliado, ModulosComercio } from "@/lib/aliados";
import { apiFetch } from "@/lib/api/server";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Promociones" };

const TIPO_LABEL: Record<string, string> = {
  temporada: "Temporada",
  volumen: "Volumen",
  campaña: "Campaña",
};

const SEGMENTO_LABEL: Record<string, string> = {
  nuevo: "Nuevos",
  ocasional: "Ocasionales",
  frecuente: "Frecuentes",
  fiel: "Fieles",
  inactivo: "Inactivos",
};

function beneficio(rules: Record<string, unknown>): string {
  const tiers = rules.tiers;
  if (Array.isArray(tiers) && tiers.length > 0) {
    return tiers
      .map((t) => {
        const tier = t as Record<string, unknown>;
        const rango = tier.max ? `${tier.min}-${tier.max}` : `${tier.min}+`;
        const premio = tier.discount_pct ? `${tier.discount_pct}%` : `regalo ${tier.free_item_sku}`;
        return `${rango} → ${premio}`;
      })
      .join(" · ");
  }
  if (rules.discount_pct !== undefined && rules.discount_pct !== null) {
    return `${rules.discount_pct}%`;
  }
  return "—";
}

function estadoVigencia(active: boolean, from: string | null, to: string | null) {
  if (!active) return { label: "Inactiva", tone: "neutral" as const };
  const ahora = Date.now();
  if (from && new Date(from).getTime() > ahora) return { label: "Programada", tone: "warning" as const };
  if (to && new Date(to).getTime() < ahora) return { label: "Vencida", tone: "danger" as const };
  return { label: "Activa", tone: "success" as const };
}

export default async function PromotionsPage() {
  const [res, categoriasRes, productosRes, modulosRes] = await Promise.all([
    apiFetch<Promotion[]>("/pack/commerce/promotions"),
    apiFetch<Option[]>("/pack/commerce/categories"),
    apiFetch<Option[]>("/pack/commerce/products"),
    apiFetch<ModulosComercio>("/pack/commerce/modulos"),
  ]);
  // HU-CRM-03: `null` = aliados apagados en el negocio.
  const aliadosRes =
    modulosRes.ok && modulosRes.data.aliados ? await apiFetch<Aliado[]>("/pack/commerce/allies") : null;
  const aliados: Option[] | null = aliadosRes ? (aliadosRes.ok ? aliadosRes.data : []) : null;
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar las promociones: {res.error}
      </p>
    );
  }
  const categorias = categoriasRes.ok ? categoriasRes.data : [];
  const productos = productosRes.ok ? productosRes.data : [];
  const nombreCategoria = new Map(categorias.map((c) => [c.id, c.name]));
  const nombreProducto = new Map(productos.map((p) => [p.id, p.name]));
  const nombreAliado = new Map((aliados ?? []).map((a) => [a.id, a.name]));

  const columns: Column<Promotion>[] = [
    {
      key: "nombre",
      header: "Promoción",
      cell: (p) => (
        <div className="flex flex-col gap-1">
          <span className="text-headline">{String(p.rules.label ?? "Sin nombre")}</span>
          <Badge variant="neutral">{TIPO_LABEL[p.type] ?? p.type}</Badge>
        </div>
      ),
    },
    {
      key: "beneficio",
      header: "Beneficio",
      cell: (p) => <span className="text-body">{beneficio(p.rules)}</span>,
    },
    {
      key: "vigencia",
      header: "Vigencia",
      cell: (p) => {
        const estado = estadoVigencia(p.active, p.valid_from, p.valid_to);
        return (
          <div className="flex flex-col gap-1">
            <Badge variant={estado.tone}>{estado.label}</Badge>
            <span className="text-xs text-body">
              {p.valid_from ? formatDateTime(p.valid_from) : "—"} →{" "}
              {p.valid_to ? formatDateTime(p.valid_to) : "—"}
            </span>
          </div>
        );
      },
    },
    {
      key: "alcance",
      header: "Alcance",
      cell: (p) => (
        <div className="flex flex-col gap-1 text-body">
          <span>
            {p.product_id
              ? `Producto: ${nombreProducto.get(p.product_id) ?? "—"}`
              : p.category_id
                ? `Categoría: ${nombreCategoria.get(p.category_id) ?? "—"}`
                : "Toda la tienda"}
          </span>
          {p.ally_id && (
            <span className="text-xs text-text-soft">Aliado: {nombreAliado.get(p.ally_id) ?? "eliminado"}</span>
          )}
          {p.eligible_segments && p.eligible_segments.length > 0 && (
            <span className="text-xs text-text-soft">
              {p.eligible_segments.map((s) => SEGMENTO_LABEL[s] ?? s).join(", ")}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "estado",
      header: "Interruptor",
      align: "right",
      cell: (p) => <PromotionToggle promotionId={p.id} active={p.active} />,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (p) => <PromotionDialog promotion={p} categories={categorias} products={productos} allies={aliados} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Promociones"
        description="Descuentos por temporada, volumen o campaña que el agente puede aplicar (elige el mayor beneficio, sin acumular)."
        actions={<PromotionDialog categories={categorias} products={productos} allies={aliados} />}
      />
      <DataTable
        columns={columns}
        rows={res.data}
        getRowKey={(p) => p.id}
        emptyTitle="Sin promociones"
        emptyDescription="Crea la primera para que el agente ofrezca descuentos."
      />
    </div>
  );
}
