import { OrderStatus } from "@/app/(app)/comercio/pedidos/_components/order-status";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch, getBusinessCurrency } from "@/lib/api/server";
import { formatDateTime, formatMoney } from "@/lib/format";

export const metadata = { title: "Pedidos" };

type Order = {
  id: string;
  public_order_number: string;
  total: number;
  status: string;
  payment_status: string;
  payment_method: string;
  delivery_method: string;
  delivery_full_name: string | null;
  delivery_address: string | null;
  created_at: string | null;
  line_items: { name: string; quantity: number; unit_price: number }[];
};

export default async function OrdersPage() {
  const res = await apiFetch<Order[]>("/pack/commerce/orders");
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar los pedidos: {res.error}
      </p>
    );
  }

  const currency = await getBusinessCurrency();

  const columns: Column<Order>[] = [
    {
      key: "pedido",
      header: "Pedido",
      cell: (o) => <span className="font-mono text-xs text-headline">{o.public_order_number}</span>,
    },
    {
      key: "cliente",
      header: "Cliente",
      cell: (o) => (
        <div className="flex flex-col">
          <span className="text-body">{o.delivery_full_name ?? "—"}</span>
          {o.delivery_address && (
            <span className="text-xs text-text-soft">{o.delivery_address}</span>
          )}
        </div>
      ),
    },
    {
      key: "items",
      header: "Ítems",
      cell: (o) => (
        <div className="flex flex-col gap-0.5 text-xs text-body">
          {o.line_items.length === 0
            ? "—"
            : o.line_items.map((line, i) => (
                <span key={`${o.id}-${i}`}>
                  {line.quantity} × {line.name} · {formatMoney(line.unit_price, currency)}
                </span>
              ))}
        </div>
      ),
    },
    { key: "total", header: "Total", align: "right", cell: (o) => formatMoney(o.total, currency) },
    {
      key: "pago",
      header: "Pago",
      cell: (o) => (
        <Badge variant={o.payment_status === "pagado" ? "success" : "neutral"}>
          {o.payment_status}
        </Badge>
      ),
    },
    {
      key: "fecha",
      header: "Fecha",
      cell: (o) => <span className="text-body">{formatDateTime(o.created_at)}</span>,
    },
    {
      key: "acciones",
      header: "Estado",
      align: "right",
      cell: (o) => <OrderStatus orderId={o.id} status={o.status} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pedidos"
        description="Pedidos confirmados por el agente. El pago y el estado son ejes independientes."
      />
      <DataTable
        columns={columns}
        rows={res.data}
        getRowKey={(o) => o.id}
        emptyTitle="Sin pedidos todavía"
        emptyDescription="Cuando el agente confirme un pedido, aparecerá aquí."
      />
    </div>
  );
}
