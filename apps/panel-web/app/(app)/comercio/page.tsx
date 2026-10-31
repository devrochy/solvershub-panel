import { StatCard } from "@/components/ui/stat-card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/domain/status-badge";
import { apiFetch, getBusinessCurrency } from "@/lib/api/server";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";

export const metadata = { title: "Comercio" };

type Dashboard = {
  kpi: { leads: number; products: number; promotions: number; orders: number };
  recent_orders: {
    id: string;
    public_order_number: string;
    total: number;
    status: string;
    created_at: string | null;
  }[];
};

const ORDER_STATUS: Record<string, { label: string; variant: "success" | "warning" | "danger" | "neutral" | "accent" }> = {
  abierto: { label: "Abierto", variant: "accent" },
  despachado: { label: "Despachado", variant: "warning" },
  entregado: { label: "Entregado", variant: "success" },
  cancelado: { label: "Cancelado", variant: "danger" },
  expirado: { label: "Expirado", variant: "neutral" },
};

export default async function CommercePage() {
  const res = await apiFetch<Dashboard>("/pack/commerce/dashboard");
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar Comercio: {res.error}
      </p>
    );
  }
  const currency = await getBusinessCurrency();
  const { kpi, recent_orders } = res.data;

  const columns: Column<Dashboard["recent_orders"][number]>[] = [
    {
      key: "pedido",
      header: "Pedido",
      cell: (o) => <span className="font-mono text-xs text-headline">{o.public_order_number}</span>,
    },
    { key: "total", header: "Total", align: "right", cell: (o) => formatMoney(o.total, currency) },
    {
      key: "estado",
      header: "Estado",
      cell: (o) => <StatusBadge value={o.status} map={ORDER_STATUS} />,
    },
    {
      key: "fecha",
      header: "Fecha",
      cell: (o) => <span className="text-body">{formatDate(o.created_at)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Comercio"
        description="Catálogo, promociones y pedidos del negocio (habilidad Comercio)."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clientes" value={formatNumber(kpi.leads)} />
        <StatCard label="Productos" value={formatNumber(kpi.products)} />
        <StatCard label="Promociones" value={formatNumber(kpi.promotions)} tone="accent" />
        <StatCard label="Pedidos" value={formatNumber(kpi.orders)} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">Últimos pedidos</h2>
        <DataTable
          columns={columns}
          rows={recent_orders}
          getRowKey={(o) => o.id}
          emptyTitle="Sin pedidos todavía"
          emptyDescription="Los pedidos que confirme el agente aparecerán aquí."
        />
      </section>
    </div>
  );
}
