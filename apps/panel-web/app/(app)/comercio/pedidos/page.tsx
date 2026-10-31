import { OrderStatus } from "@/app/(app)/comercio/pedidos/_components/order-status";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterChips } from "@/components/ui/filter-chips";
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
  plan_activation_status?: string | null;
  plan_activation_error?: string | null;
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; pago?: string }>;
}) {
  const sp = await searchParams;
  const res = await apiFetch<Order[]>("/pack/commerce/orders");
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar los pedidos: {res.error}
      </p>
    );
  }

  const currency = await getBusinessCurrency();
  const estado = sp.estado && sp.estado !== "todos" ? sp.estado : null;
  const pago = sp.pago && sp.pago !== "todos" ? sp.pago : null;
  const filas = res.data.filter(
    (o) => (!estado || o.status === estado) && (!pago || o.payment_status === pago),
  );

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
        <div className="flex flex-col items-start gap-1">
          <Badge variant={o.payment_status === "pagado" ? "success" : "neutral"}>
            {o.payment_status}
          </Badge>
          {o.plan_activation_status === "pendiente" && (
            // HU-SUB-09: pagado pero el plan no se activó (configuración del proveedor).
            <Badge variant="danger" title={o.plan_activation_error ?? undefined}>
              Plan sin activar
            </Badge>
          )}
        </div>
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
      <FilterChips
        label="Filtros de pedidos"
        items={[
          { label: "Todos", href: "/comercio/pedidos", active: !estado && !pago },
          { label: "Por despachar", href: "/comercio/pedidos?estado=abierto", active: estado === "abierto" },
          { label: "Pagados", href: "/comercio/pedidos?pago=pagado", active: pago === "pagado" },
          { label: "Pago pendiente", href: "/comercio/pedidos?pago=pendiente", active: pago === "pendiente" },
        ]}
      />
      <DataTable
        columns={columns}
        rows={filas}
        getRowKey={(o) => o.id}
        emptyTitle={estado || pago ? "Sin pedidos con estos filtros" : "Sin pedidos todavía"}
        emptyDescription={
          estado || pago
            ? "Prueba con otro filtro o quita los filtros."
            : "Cuando el agente confirme un pedido, aparecerá aquí."
        }
      />
    </div>
  );
}
