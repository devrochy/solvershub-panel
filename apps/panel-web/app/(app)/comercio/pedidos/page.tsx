import Link from "next/link";

import { OrderStatus } from "@/app/(app)/comercio/pedidos/_components/order-status";
import { PedidosFilters } from "@/app/(app)/comercio/pedidos/_components/pedidos-filters";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch, getBusinessCurrency } from "@/lib/api/server";
import type { Me, Order } from "@/lib/api/types";
import { hrefFicha, puedeVerClientes } from "@/lib/clientes";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  consultaPedidos,
  etiquetaDePago,
  filtrosLimpios,
  hrefPedidos,
  paginaDe,
  PEDIDOS_POR_PAGINA,
  type FiltrosPedidos,
} from "@/lib/pedidos";

export const metadata = { title: "Pedidos" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<FiltrosPedidos> }) {
  const sp = await searchParams;
  const filtros = filtrosLimpios(sp);
  const page = paginaDe(sp.page);
  const [res, me] = await Promise.all([
    apiFetch<Order[]>(`/pack/commerce/orders?${consultaPedidos(sp).toString()}`),
    apiFetch<Me>("/admin/me"),
  ]);
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar los pedidos: {res.error}
      </p>
    );
  }
  // HU-CRM-20: el nombre abre la ficha solo si la sesión ve Clientes.
  const puedeAbrirFicha = me.ok && puedeVerClientes(me.data);
  const total = res.total ?? res.data.length;
  const hayMas = (page - 1) * PEDIDOS_POR_PAGINA + res.data.length < total;
  const hayFiltros = Boolean(filtros.estado || filtros.pago || filtros.q || filtros.cliente);
  const nombreDelCliente = filtros.cliente
    ? (res.data.find((o) => o.customer_id === filtros.cliente)?.customer_name ?? null)
    : null;

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
          {(() => {
            const nombre = o.customer_name ?? o.delivery_full_name ?? "—";
            return puedeAbrirFicha ? (
              <Link
                href={hrefFicha(o.customer_id, { agente: "ventas" })}
                className="text-link hover:underline"
              >
                {nombre}
              </Link>
            ) : (
              <span className="text-body">{nombre}</span>
            );
          })()}
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
            {etiquetaDePago(o.payment_status)}
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
      <PedidosFilters
        estado={filtros.estado}
        pago={filtros.pago}
        q={filtros.q}
        cliente={filtros.cliente}
        nombreDelCliente={nombreDelCliente}
      />
      <DataTable
        columns={columns}
        rows={res.data}
        getRowKey={(o) => o.id}
        emptyTitle={hayFiltros ? "Sin pedidos con estos filtros" : "Sin pedidos todavía"}
        emptyDescription={
          hayFiltros
            ? "Prueba con otro filtro o quita los filtros."
            : "Cuando el agente confirme un pedido, aparecerá aquí."
        }
        caption="Pedidos"
        serverPaginated
      />
      <Pagination
        page={page}
        hasMore={hayMas}
        total={total}
        label="pedidos"
        makeHref={(destino) => hrefPedidos(filtros, destino)}
      />
    </div>
  );
}
