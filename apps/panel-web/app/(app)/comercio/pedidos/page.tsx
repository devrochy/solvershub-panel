import Link from "next/link";

import { BotonSiguientePaso } from "@/app/(app)/comercio/pedidos/_components/cambiar-estado";
import { PedidoAbierto } from "@/app/(app)/comercio/pedidos/_components/pedido-abierto";
import { PedidosFilters } from "@/app/(app)/comercio/pedidos/_components/pedidos-filters";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch, getBusinessCurrency } from "@/lib/api/server";
import type { Me, Order } from "@/lib/api/types";
import { hrefFicha, puedeVerClientes } from "@/lib/clientes";
import { formatMoney, formatNumber } from "@/lib/format";
import { consultaPedidos, filtrosLimpios, hrefPedidos, paginaDe, PEDIDOS_POR_PAGINA, type FiltrosPedidos } from "@/lib/pedidos";
import { cuandoFue, ETAPAS, estadoDePedido, pagoDePedido, productosDelPedido } from "@/lib/ventas";

export const metadata = { title: "Pedidos" };

/** Lo que entra en el tablero por etapa: la API no pagina más allá de 200. */
const TOPE_POR_ETAPA = 200;

const nombreDe = (o: Order) => o.customer_name ?? o.delivery_full_name ?? "Cliente sin nombre";

/**
 * Pedidos (VEN-02 a 05): la lista en palabras o el tablero por etapa; tocar un pedido lo abre en un
 * cajón con su siguiente paso. El estado se cambia ahí, no en cada fila.
 */
export default async function OrdersPage({ searchParams }: { searchParams: Promise<FiltrosPedidos> }) {
  const sp = await searchParams;
  const filtros = filtrosLimpios(sp);
  const porEtapa = filtros.vista === "etapas";
  const page = porEtapa ? 1 : paginaDe(sp.page);
  const consulta = consultaPedidos(porEtapa ? { ...sp, estado: "", page: "1" } : sp);
  if (porEtapa) consulta.set("limit", String(TOPE_POR_ETAPA));
  const [res, me, moneda] = await Promise.all([
    apiFetch<Order[]>(`/pack/commerce/orders?${consulta.toString()}`),
    apiFetch<Me>("/admin/me"),
    getBusinessCurrency(),
  ]);

  const header = <PageHeader title="Pedidos" description="Lo que vendió el asistente. Toca un pedido para verlo y pasarlo al siguiente paso." />;
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorDeCarga titulo="No pudimos cargar los pedidos" detalle={res.error} />
      </div>
    );
  }

  // HU-CRM-20: el cajón enlaza a la ficha del cliente solo si la sesión ve Clientes.
  const puedeAbrirFicha = me.ok && puedeVerClientes(me.data);
  const total = res.total ?? res.data.length;
  const hayMas = (page - 1) * PEDIDOS_POR_PAGINA + res.data.length < total;
  const hayFiltros = Boolean(filtros.estado || filtros.pago || filtros.q || filtros.cliente);
  const nombreDelCliente = filtros.cliente ? (res.data.find((o) => o.customer_id === filtros.cliente)?.customer_name ?? null) : null;
  const hrefDe = (o: Order) => hrefPedidos({ ...filtros, pedido: o.id }, page);
  const abierto = filtros.pedido ? res.data.find((o) => o.id === filtros.pedido) : undefined;

  const columns: Column<Order>[] = [
    {
      key: "cliente",
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
        const pago = pagoDePedido(o.payment_status);
        return <Badge variant={pago.tono}>{pago.label}</Badge>;
      },
    },
    {
      key: "estado",
      header: "Estado",
      cell: (o) => {
        const estado = estadoDePedido(o.status);
        return <Badge variant={estado.tono}>{estado.label}</Badge>;
      },
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (o) => <span className="font-medium tabular-nums text-headline">{formatMoney(o.total, moneda)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {header}
      <PedidosFilters filtros={filtros} nombreDelCliente={nombreDelCliente} />

      {porEtapa ? (
        <TableroPorEtapa pedidos={res.data} moneda={moneda} hrefDe={hrefDe} filtros={filtros} recortado={total > res.data.length} />
      ) : (
        <>
          <TablaResponsiva
            etiqueta="Pedidos"
            caption="Pedidos"
            columns={columns}
            rows={res.data}
            getRowKey={(o) => o.id}
            getRowHref={hrefDe}
            getRowLabel={(o) => `Abrir el pedido ${o.public_order_number} de ${nombreDe(o)}`}
            scrollAlAbrir={false}
            serverPaginated
            emptyTitle={hayFiltros ? "No hay pedidos con este filtro" : "Aún no hay pedidos"}
            emptyDescription={
              hayFiltros ? "Prueba con otro filtro o quita la búsqueda." : "Cuando el asistente cierre una venta por WhatsApp, el pedido llega aquí."
            }
            filaCelular={(o) => ({
              titulo: nombreDe(o),
              detalle: `${o.public_order_number} · ${cuandoFue(o.created_at)} · ${pagoDePedido(o.payment_status).label} · ${estadoDePedido(o.status).label}`,
              fin: formatMoney(o.total, moneda),
              href: hrefDe(o),
            })}
          />
          <Pagination page={page} hasMore={hayMas} total={total} label="pedidos" singular="pedido" makeHref={(destino) => hrefPedidos({ ...filtros, pedido: "" }, destino)} />
        </>
      )}

      {abierto && (
        <PedidoAbierto
          key={`${abierto.id}-${abierto.status}`}
          pedido={abierto}
          moneda={moneda}
          hrefFicha={puedeAbrirFicha ? hrefFicha(abierto.customer_id, { agente: "ventas" }) : null}
          alCerrar={hrefPedidos({ ...filtros, pedido: "" }, page)}
        />
      )}
    </div>
  );
}

/**
 * Vista «Por etapa» (la tarjeta de Pedidos): una columna por estado con el botón del paso
 * siguiente en cada tarjeta. Los cerrados (cancelados y vencidos) quedan a un enlace.
 */
function TableroPorEtapa({
  pedidos,
  moneda,
  hrefDe,
  filtros,
  recortado,
}: {
  pedidos: Order[];
  moneda: string;
  hrefDe: (o: Order) => string;
  filtros: ReturnType<typeof filtrosLimpios>;
  recortado: boolean;
}) {
  const cerrados = [
    { estado: "cancelado", titulo: "Cancelados" },
    { estado: "expirado", titulo: "Vencidos" },
  ]
    .map((c) => ({ ...c, n: pedidos.filter((o) => o.status === c.estado).length }))
    .filter((c) => c.n > 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid items-start gap-4 lg:grid-cols-3">
        {ETAPAS.map((etapa) => {
          const lista = pedidos.filter((o) => o.status === etapa.estado);
          return (
            <section key={etapa.estado} aria-label={etapa.titulo} className="flex flex-col gap-3 rounded-lg border border-border-soft bg-bg-deep p-3">
              <h2 className="flex items-center justify-between px-1 text-sm font-semibold text-headline">
                {etapa.titulo}
                <span className="text-xs font-normal tabular-nums text-text-soft">{formatNumber(lista.length)}</span>
              </h2>
              {lista.length === 0 && <p className="px-1 pb-2 text-sm text-text-soft">{etapa.vacio}</p>}
              {lista.map((o) => {
                const pago = pagoDePedido(o.payment_status);
                return (
                  <article key={o.id} className="relative flex flex-col gap-2 rounded-lg border border-border-soft bg-surface p-3.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <Link
                        href={hrefDe(o)}
                        scroll={false}
                        className="truncate font-medium text-headline outline-none after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-focus"
                      >
                        {nombreDe(o)}
                      </Link>
                      <span className="shrink-0 font-semibold tabular-nums text-headline">{formatMoney(o.total, moneda)}</span>
                    </div>
                    <span className="text-xs text-text-soft">
                      {o.public_order_number} · {cuandoFue(o.created_at)}
                    </span>
                    <span className="text-sm text-body">{productosDelPedido(o.line_items)}</span>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant={pago.tono}>{pago.label}</Badge>
                      <div className="relative z-10">
                        <BotonSiguientePaso pedido={o} variant="outline" />
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-soft">
        {cerrados.length > 0 && <span>Cerrados:</span>}
        {cerrados.map((c) => (
          <Link key={c.estado} href={hrefPedidos({ ...filtros, vista: "", estado: c.estado, pedido: "" })} className="text-link hover:underline">
            {c.titulo} ({formatNumber(c.n)})
          </Link>
        ))}
        {recortado && <span>Se muestran los {TOPE_POR_ETAPA} pedidos más recientes; usa la lista para ver los anteriores.</span>}
      </div>
    </div>
  );
}
