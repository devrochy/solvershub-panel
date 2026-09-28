import { PromotionDialog, PromotionToggle } from "@/app/(app)/comercio/promociones/_components/promotion-dialog";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Promociones" };

type Promotion = {
  id: string;
  type: string;
  rules: Record<string, unknown>;
  active: boolean;
  valid_from: string | null;
  valid_to: string | null;
  category_id: string | null;
  product_id: string | null;
};

function rulesSummary(rules: Record<string, unknown>): string {
  const entries = Object.entries(rules ?? {});
  if (entries.length === 0) return "—";
  return entries.map(([k, v]) => `${k}: ${String(v)}`).join(" · ");
}

export default async function PromotionsPage() {
  const res = await apiFetch<Promotion[]>("/pack/commerce/promotions");
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar las promociones: {res.error}
      </p>
    );
  }

  const columns: Column<Promotion>[] = [
    {
      key: "tipo",
      header: "Tipo",
      cell: (p) => <Badge variant="neutral">{p.type}</Badge>,
    },
    {
      key: "reglas",
      header: "Reglas",
      cell: (p) => <span className="font-mono text-xs text-body">{rulesSummary(p.rules)}</span>,
    },
    {
      key: "vigencia",
      header: "Vigencia",
      cell: (p) => (
        <span className="text-body">
          {p.valid_from ? formatDate(p.valid_from) : "—"} → {p.valid_to ? formatDate(p.valid_to) : "—"}
        </span>
      ),
    },
    {
      key: "alcance",
      header: "Alcance",
      cell: (p) => (
        <span className="text-body">
          {p.product_id ? "Producto" : p.category_id ? "Categoría" : "Toda la tienda"}
        </span>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      align: "right",
      cell: (p) => <PromotionToggle promotionId={p.id} active={p.active} />,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (p) => <PromotionDialog promotion={p} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Promociones"
        description="Descuentos por temporada, volumen o campaña que el agente puede aplicar."
        actions={<PromotionDialog />}
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
