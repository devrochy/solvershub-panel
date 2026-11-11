"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { BotonSiguientePaso, MasAccionesDePedido } from "@/app/(app)/comercio/pedidos/_components/cambiar-estado";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { Order } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { cuandoFue, estadoDePedido, formaDeEntrega, metodoDePago, pagoDePedido } from "@/lib/ventas";

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sh-label font-medium text-text-soft">{titulo}</h3>
      {children}
    </section>
  );
}

/**
 * Un pedido abierto en el cajón (VEN-03): qué pidió, a dónde va, cómo paga y un solo botón con el
 * paso siguiente. Los demás cambios (cancelar, marcar como vencido…) van en «Más acciones».
 */
export function PedidoAbierto({
  pedido,
  moneda,
  hrefFicha,
  alCerrar,
}: {
  pedido: Order;
  moneda: string;
  /** Ficha del cliente en Clientes; `null` si la sesión no ve Clientes (HU-CRM-20). */
  hrefFicha: string | null;
  alCerrar: string;
}) {
  const router = useRouter();
  const nombre = pedido.customer_name ?? pedido.delivery_full_name ?? "Cliente sin nombre";
  const estado = estadoDePedido(pedido.status);
  const pago = pagoDePedido(pedido.payment_status);
  const subtotal = pedido.line_items.reduce((suma, l) => suma + l.quantity * l.unit_price, 0);
  const otros = pedido.total - subtotal;

  return (
    <Sheet open onOpenChange={(abierto) => !abierto && router.replace(alCerrar, { scroll: false })}>
      <SheetContent
        title={nombre}
        description={`${pedido.public_order_number} · ${cuandoFue(pedido.created_at)}`}
        hero={
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={pago.tono}>{pago.label}</Badge>
            <Badge variant={estado.tono}>{estado.label}</Badge>
          </div>
        }
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <MasAccionesDePedido pedido={pedido} />
            <BotonSiguientePaso pedido={pedido} />
          </div>
        }
        className="sm:max-w-lg"
      >
        <div className="flex flex-col gap-6">
          <Bloque titulo="Productos">
            <ul className="flex flex-col gap-2 text-sm">
              {pedido.line_items.length === 0 && <li className="text-text-soft">El pedido no tiene productos.</li>}
              {pedido.line_items.map((l, i) => (
                <li key={`${l.name}-${i}`} className="flex items-baseline justify-between gap-3">
                  <span className="text-body">
                    {l.quantity} × {l.name}
                    {l.quantity > 1 && <span className="text-text-soft"> · {formatMoney(l.unit_price, moneda)} c/u</span>}
                  </span>
                  <span className="shrink-0 tabular-nums text-body">{formatMoney(l.quantity * l.unit_price, moneda)}</span>
                </li>
              ))}
              {Math.abs(otros) >= 1 && (
                <li className="flex items-baseline justify-between gap-3">
                  <span className="text-text-soft">{otros > 0 ? "Envío y otros cargos" : "Descuentos"}</span>
                  <span className="shrink-0 tabular-nums text-body">{formatMoney(otros, moneda)}</span>
                </li>
              )}
              <li className="flex items-baseline justify-between gap-3 border-t border-border-soft pt-2">
                <span className="font-medium text-headline">Total</span>
                <span className="shrink-0 font-semibold tabular-nums text-headline">{formatMoney(pedido.total, moneda)}</span>
              </li>
            </ul>
          </Bloque>

          <Bloque titulo="Entrega">
            <p className="text-sm text-body">
              {formaDeEntrega(pedido.delivery_method)}
              {pedido.delivery_address ? `: ${pedido.delivery_address}` : ""}
            </p>
            {pedido.delivery_full_name && pedido.delivery_full_name !== nombre && (
              <p className="text-sm text-text-soft">Recibe {pedido.delivery_full_name}</p>
            )}
          </Bloque>

          <Bloque titulo="Pago">
            <p className="text-sm text-body">
              {metodoDePago(pedido.payment_method)} · {pago.label.toLowerCase()}
            </p>
          </Bloque>

          {hrefFicha && (
            <Link href={hrefFicha} className="self-start text-sm text-link hover:underline">
              Ver la ficha de {nombre}
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
