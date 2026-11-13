import Link from "next/link";
import { Plus } from "lucide-react";

import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Column } from "@/components/ui/data-table";
import { KpiTile } from "@/components/ui/kpi-tile";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch, getBusinessCurrency } from "@/lib/api/server";
import type { Order } from "@/lib/api/types";
import { formatMoney, formatNumber } from "@/lib/format";
import { hrefPedidos } from "@/lib/pedidos";
import { agotadas, cuandoFue, estadoDePedido, pagoDePedido, productosDelPedido, vendidoEnElMes, type Variante } from "@/lib/ventas";

export const metadata = { title: "Ventas" };

/** Lo que la API entrega de una vez: con más pedidos en el mes, la cifra dice «más de». */
const TOPE = 200;

const nombreDe = (o: Order) => o.customer_name ?? o.delivery_full_name ?? "Cliente sin nombre";

/**
 * Resumen de Ventas (VEN-01): lo que pide acción hoy (por despachar, pagos pendientes, agotados) y
 * lo vendido en el mes. Cada cifra abre su lista ya filtrada; debajo, los últimos pedidos.
 */
export default async function VentasPage() {
  const [ultimos, porDespachar, pendientes, pagados, productos, moneda] = await Promise.all([
    apiFetch<Order[]>("/pack/commerce/orders?limit=5"),
    apiFetch<Order[]>("/pack/commerce/orders?estado=abierto&limit=1"),
    apiFetch<Order[]>(`/pack/commerce/orders?pago=pendiente&limit=${TOPE}`),
    apiFetch<Order[]>(`/pack/commerce/orders?pago=pagado&limit=${TOPE}`),
    apiFetch<{ name: string; variants: Variante[] }[]>("/pack/commerce/products"),
    getBusinessCurrency(),
  ]);

  const header = (
    <PageHeader
      title="Ventas"
      description="Pedidos, catálogo y promociones con los que tu asistente vende."
      helpSection="ventas"
      actions={
        <Button asChild variant="accent">
          <Link href="/comercio/productos?producto=nuevo" scroll={false}>
            <Plus className="h-4 w-4" aria-hidden /> Nuevo producto
          </Link>
        </Button>
      }
    />
  );
  if (!ultimos.ok) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorDeCarga titulo="No pudimos cargar Ventas" detalle={ultimos.error} />
      </div>
    );
  }

  const nPorDespachar = porDespachar.ok ? (porDespachar.total ?? porDespachar.data.length) : null;
  const sinPagar = pendientes.ok ? pendientes.data.filter((o) => o.status !== "cancelado" && o.status !== "expirado") : [];
  const nPendientes = pendientes.ok ? (pendientes.total ?? pendientes.data.length) : null;
  const vendido = pagados.ok ? vendidoEnElMes(pagados.data) : null;
  const vendidoIncompleto = pagados.ok && pagados.data.length >= TOPE;
  const sinStock = productos.ok ? agotadas(productos.data) : null;

  const columns: Column<Order>[] = [
    {
      key: "pedido",
      header: "Pedido",
      cell: (o) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-headline">{nombreDe(o)}</span>
          <span className="text-xs text-text-soft">
            {o.public_order_number} · {cuandoFue(o.created_at)}
          </span>
        </div>
      ),
    },
    { key: "productos", header: "Productos", cell: (o) => <span className="text-body">{productosDelPedido(o.line_items)}</span> },
    {
      key: "pago",
      header: "Pago",
      cell: (o) => {
        const p = pagoDePedido(o.payment_status);
        return <Badge variant={p.tono}>{p.label}</Badge>;
      },
    },
    {
      key: "estado",
      header: "Estado",
      cell: (o) => {
        const e = estadoDePedido(o.status);
        return <Badge variant={e.tono}>{e.label}</Badge>;
      },
    },
    { key: "total", header: "Total", align: "right", cell: (o) => <span className="font-medium tabular-nums text-headline">{formatMoney(o.total, moneda)}</span> },
  ];

  return (
    <div className="flex flex-col gap-6">
      {header}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Por despachar"
          value={nPorDespachar === null ? "—" : formatNumber(nPorDespachar)}
          hint={nPorDespachar ? "Pedidos confirmados sin enviar" : "Nada pendiente de envío"}
          tone={nPorDespachar ? "warning" : "default"}
          href={hrefPedidos({ estado: "abierto" })}
        />
        <KpiTile
          label="Pago pendiente"
          value={nPendientes === null ? "—" : formatNumber(nPendientes)}
          hint={
            sinPagar.length
              ? `${formatMoney(sinPagar.reduce((s, o) => s + o.total, 0), moneda)} por cobrar`
              : "Ningún pedido abierto sin pagar"
          }
          tone={sinPagar.length ? "warning" : "default"}
          href={hrefPedidos({ pago: "pendiente" })}
        />
        <KpiTile
          label="Vendido este mes"
          value={vendido ? `${vendidoIncompleto ? "Más de " : ""}${formatMoney(vendido.total, moneda)}` : "—"}
          hint={vendido ? (vendido.pedidos === 1 ? "1 pedido pagado" : `${formatNumber(vendido.pedidos)} pedidos pagados`) : undefined}
          href={hrefPedidos({ pago: "pagado" })}
        />
        <KpiTile
          label="Agotados"
          value={sinStock ? formatNumber(sinStock.variantes) : "—"}
          hint={sinStock?.ejemplo ? (sinStock.variantes > 1 ? `${sinStock.ejemplo} y otras` : sinStock.ejemplo) : "Todo tiene stock"}
          tone={sinStock?.variantes ? "danger" : "default"}
          href="/comercio/productos"
        />
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="ultimos-pedidos">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="ultimos-pedidos" className="font-display text-lg font-semibold text-headline">
            Últimos pedidos
          </h2>
          {ultimos.data.length > 0 && (
            <Link href="/comercio/pedidos" className="text-sm text-link hover:underline">
              Ver todos
            </Link>
          )}
        </div>
        <TablaResponsiva
          etiqueta="Últimos pedidos"
          caption="Últimos pedidos"
          columns={columns}
          rows={ultimos.data}
          getRowKey={(o) => o.id}
          getRowHref={(o) => hrefPedidos({ pedido: o.id })}
          getRowLabel={(o) => `Abrir el pedido ${o.public_order_number} de ${nombreDe(o)}`}
          emptyTitle="Aún no hay pedidos"
          emptyDescription="Cuando el asistente cierre una venta por WhatsApp, el pedido llega aquí."
          filaCelular={(o) => ({
            titulo: nombreDe(o),
            detalle: `${cuandoFue(o.created_at)} · ${pagoDePedido(o.payment_status).label} · ${estadoDePedido(o.status).label}`,
            fin: formatMoney(o.total, moneda),
            href: hrefPedidos({ pedido: o.id }),
          })}
        />
      </section>
    </div>
  );
}
