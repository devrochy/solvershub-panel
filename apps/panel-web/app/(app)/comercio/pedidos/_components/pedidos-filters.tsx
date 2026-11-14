"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Columns3, List, X } from "lucide-react";

import { SearchInput } from "@/components/ui/search-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { etiquetaDeEstado, etiquetaDePago, hrefPedidos, type FiltrosPedidos } from "@/lib/pedidos";

type Filtros = Required<Omit<FiltrosPedidos, "page">>;

/** Un solo filtro (VEN-04): lo que más se mira, cada opción es un enlace. */
const OPCIONES: { value: string; label: string; filtro: Pick<FiltrosPedidos, "estado" | "pago"> }[] = [
  { value: "todos", label: "Todos", filtro: {} },
  { value: "abierto", label: "Por despachar", filtro: { estado: "abierto" } },
  { value: "despachado", label: "En camino", filtro: { estado: "despachado" } },
  { value: "pendiente", label: "Pago pendiente", filtro: { pago: "pendiente" } },
  { value: "entregado", label: "Entregados", filtro: { estado: "entregado" } },
];

function opcionActual({ estado, pago }: Pick<Filtros, "estado" | "pago">): string | null {
  if (!estado && !pago) return "todos";
  if (!pago) return OPCIONES.some((o) => o.value === estado) ? estado : null;
  if (!estado && pago === "pendiente") return "pendiente";
  return null;
}

function Chip({ href, etiqueta, children }: { href: string; etiqueta: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={etiqueta}
      className="inline-flex items-center gap-1.5 rounded-full bg-hover px-3 py-1 text-sm text-body hover:underline focus-visible:outline-2 focus-visible:outline-focus"
    >
      {children}
      <X className="h-3.5 w-3.5" aria-hidden />
    </Link>
  );
}

/**
 * Filtros de Pedidos (VEN-04): un control segmentado, una búsqueda que filtra mientras se escribe y
 * la vista (lista o por etapa). Un filtro que llega por enlace y no está en el control (Cancelados,
 * Pagados) o el cliente de su ficha salen como chips que se quitan.
 */
export function PedidosFilters({ filtros, nombreDelCliente }: { filtros: Filtros; nombreDelCliente: string | null }) {
  const router = useRouter();
  const [texto, setTexto] = useState(filtros.q);
  const ultimo = useRef(filtros.q);
  const base = { ...filtros, pedido: "" };

  useEffect(() => {
    if (texto.trim() === ultimo.current) return;
    const espera = setTimeout(() => {
      ultimo.current = texto.trim();
      router.replace(hrefPedidos({ ...base, q: texto }), { scroll: false });
    }, 300);
    return () => clearTimeout(espera);
    // `base` cambia con cada render; solo importa el texto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const porEtapa = filtros.vista === "etapas";
  const actual = opcionActual(filtros);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {!porEtapa && (
          // En el celular las cinco opciones no caben: la fila se desplaza en vez de apretarlas.
          <div className="max-sm:-mx-4 max-sm:w-[calc(100%+2rem)] max-sm:overflow-x-auto max-sm:px-4">
            <SegmentedControl
              label="Mostrar pedidos"
              value={actual ?? ""}
              options={OPCIONES.map((o) => ({ value: o.value, label: o.label, href: hrefPedidos({ ...base, estado: "", pago: "", ...o.filtro }) }))}
              className="w-max"
            />
          </div>
        )}
        <form role="search" className="w-full sm:w-72" onSubmit={(e) => e.preventDefault()}>
          <SearchInput label="Buscar un pedido o cliente" value={texto} onChange={setTexto} placeholder="Buscar un pedido o cliente" />
        </form>
        <SegmentedControl
          label="Cómo ver los pedidos"
          value={porEtapa ? "etapas" : "lista"}
          options={[
            { value: "lista", label: "Lista", icon: <List />, href: hrefPedidos({ ...base, vista: "" }) },
            { value: "etapas", label: "Por etapa", icon: <Columns3 />, href: hrefPedidos({ ...base, vista: "etapas", estado: "" }) },
          ]}
          className="sm:ml-auto"
        />
      </div>
      {((!porEtapa && actual === null) || filtros.cliente) && (
        <div className="flex flex-wrap gap-2">
          {!porEtapa && actual === null && (
            <Chip href={hrefPedidos({ ...base, estado: "", pago: "" })} etiqueta="Quitar el filtro de estado y pago">
              {[filtros.estado && etiquetaDeEstado(filtros.estado), filtros.pago && `Pago ${etiquetaDePago(filtros.pago).toLowerCase()}`].filter(Boolean).join(" · ")}
            </Chip>
          )}
          {filtros.cliente && (
            <Chip
              href={hrefPedidos({ ...base, cliente: "" })}
              etiqueta={`Quitar el filtro de cliente${nombreDelCliente ? ` ${nombreDelCliente}` : ""}`}
            >
              Cliente: {nombreDelCliente ?? "seleccionado"}
            </Chip>
          )}
        </div>
      )}
    </div>
  );
}
