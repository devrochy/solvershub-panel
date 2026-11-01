import Link from "next/link";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FilterChips } from "@/components/ui/filter-chips";
import { ESTADOS_DE_PEDIDO, hrefPedidos } from "@/lib/pedidos";

/**
 * Filtros de Pedidos (HU-CRM-20): estado y búsqueda por número o nombre. Si se llegó desde la ficha
 * de un cliente, el chip muestra el cliente filtrado y lo quita sin tocar los demás filtros.
 */
export function PedidosFilters({
  estado,
  pago,
  q,
  cliente,
  nombreDelCliente,
}: {
  estado: string;
  pago: string;
  q: string;
  cliente: string;
  nombreDelCliente: string | null;
}) {
  const hayFiltros = Boolean(estado || pago || q || cliente);
  return (
    <div className="flex flex-col gap-3">
      <FilterChips
        label="Filtros de pedidos"
        items={[
          { label: "Todos", href: hrefPedidos({ q, cliente }), active: !estado && !pago },
          { label: "Por despachar", href: hrefPedidos({ estado: "abierto", q, cliente }), active: estado === "abierto" && !pago },
          { label: "Pagados", href: hrefPedidos({ pago: "pagado", q, cliente }), active: pago === "pagado" && !estado },
          { label: "Pago pendiente", href: hrefPedidos({ pago: "pendiente", q, cliente }), active: pago === "pendiente" && !estado },
        ]}
      />
      <form method="get" className="flex flex-wrap items-end gap-3">
        {cliente && <input type="hidden" name="cliente" value={cliente} />}
        {pago && <input type="hidden" name="pago" value={pago} />}
        <Field label="Buscar" htmlFor="q" className="w-64">
          <Input id="q" name="q" defaultValue={q} placeholder="Número de pedido o nombre" />
        </Field>
        <Field label="Estado" htmlFor="estado" className="w-48">
          <Select id="estado" name="estado" defaultValue={estado}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS_DE_PEDIDO).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {hayFiltros && (
          <Link href="/comercio/pedidos" className="pb-2.5 text-sm text-link hover:underline">
            Limpiar
          </Link>
        )}
      </form>
      {cliente && (
        <div className="flex">
          <Link
            href={hrefPedidos({ estado, pago, q })}
            aria-label={`Quitar el filtro de cliente${nombreDelCliente ? ` ${nombreDelCliente}` : ""}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-hover px-3 py-1 text-sm text-body hover:underline"
          >
            Cliente: {nombreDelCliente ?? "seleccionado"}
            <X className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}
