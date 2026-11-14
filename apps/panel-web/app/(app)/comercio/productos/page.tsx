import Link from "next/link";
import { cookies } from "next/headers";
import { Plus } from "lucide-react";

import { AccionesDeProductos, FiltrosDeProductos } from "@/app/(app)/comercio/productos/_components/controles-de-productos";
import { FichaDeProducto, type ProductoVenta } from "@/app/(app)/comercio/productos/_components/ficha-de-producto";
import { DatosDePruebaDelModulo } from "@/components/domain/datos-de-prueba-modulo";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { RecordarVista } from "@/components/domain/recordar-vista";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { FotoProducto } from "@/components/comercio/foto-producto";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { filtroDeAliado, nombreDelAliado, type Aliado, type ModulosComercio } from "@/lib/aliados";
import { apiFetch, getBusinessCurrency } from "@/lib/api/server";
import type { AgentSummary, EstadoDatosDePruebaModulo } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import {
  coincide,
  conSubcategorias,
  etiquetaDePromo,
  hrefProductos,
  inventarioEnPalabras,
  promoDelProducto,
  type Categoria,
  type FiltrosProductos,
  type PromoVenta,
} from "@/lib/ventas";
import { VISTAS, vistaElegida, vistaEnEnlace } from "@/lib/vista-guardada";

export const metadata = { title: "Productos" };

type Producto = ProductoVenta & { category: string };
type Promo = PromoVenta & { id: string };

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/**
 * Productos (VEN-06 a 09): el catálogo en palabras, en lista o en vitrina (con foto y la promoción
 * que hoy le aplica). Tocar un producto abre su ficha en un cajón; «Nuevo producto» abre una vacía.
 */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    aliado?: string | string[];
    categoria?: string | string[];
    q?: string | string[];
    vista?: string | string[];
    producto?: string | string[];
  }>;
}) {
  // HU-CRM-03: aliados solo si el master los encendió en el negocio.
  const [modulos, sp, jar] = await Promise.all([apiFetch<ModulosComercio>("/pack/commerce/modulos"), searchParams, cookies()]);
  const conAliados = modulos.ok && modulos.data.aliados;
  const aliado = conAliados ? filtroDeAliado(sp.aliado) : null;
  const q = uno(sp.q).trim();
  const guardada = jar.get(VISTAS.productos.cookie)?.value;
  const vista = vistaElegida("productos", uno(sp.vista), guardada);
  const categoria = uno(sp.categoria);
  const filtros: FiltrosProductos = { aliado: aliado ?? "", categoria, q, vista: vistaEnEnlace("productos", vista, guardada) };
  const abierto = uno(sp.producto);

  const [productsRes, categoriesRes, alliesRes, datosPruebaRes, promosRes, moneda, agentesRes] = await Promise.all([
    apiFetch<Producto[]>(`/pack/commerce/products${aliado ? `?ally_id=${aliado}` : ""}`),
    apiFetch<Categoria[]>("/pack/commerce/categories"),
    conAliados ? apiFetch<Aliado[]>("/pack/commerce/allies") : Promise.resolve(null),
    apiFetch<EstadoDatosDePruebaModulo>("/admin/datos-de-prueba/ventas"),
    apiFetch<Promo[]>("/pack/commerce/promotions"),
    getBusinessCurrency(),
    // SPEC-45: los especialistas, para importar el catálogo con IA (CSV propio o fotos) desde aquí.
    apiFetch<AgentSummary[]>("/admin/agents"),
  ]);
  const especialistas = agentesRes.ok
    ? agentesRes.data.filter((a) => a.kind === "specialist" && a.status !== "archived").map((a) => ({ id: a.id, name: a.name }))
    : [];

  const header = (acciones?: React.ReactNode) => (
    <PageHeader title="Productos" description="Lo que el asistente puede ofrecer y cotizar." helpSection="ventas" actions={acciones} />
  );
  if (!productsRes.ok) {
    return (
      <div className="flex flex-col gap-6">
        {header()}
        <ErrorDeCarga titulo="No pudimos cargar los productos" detalle={productsRes.error} />
      </div>
    );
  }
  const categorias = categoriesRes.ok ? categoriesRes.data : [];
  // `null` = aliados apagados: ni filtro, ni selector, ni nombre del aliado.
  const aliados = conAliados ? (alliesRes?.ok ? alliesRes.data : []) : null;
  const promos = promosRes.ok ? promosRes.data : [];
  const todos = productsRes.data;
  // «Ver sus productos» desde Categorías: la categoría y sus subcategorías.
  const enCategoria = categoria ? conSubcategorias(categoria, categorias) : null;
  const nombreDeCategoria = categoria ? (categorias.find((c) => c.id === categoria)?.name ?? null) : null;
  const productos = todos.filter(
    (p) => (!q || coincide(`${p.name} ${p.description}`, q)) && (!enCategoria || (p.category_id !== null && enCategoria.has(p.category_id))),
  );
  const hrefDe = (p: { id: string }) => hrefProductos({ ...filtros, producto: p.id });
  const detalle = (p: Producto) =>
    [p.category || "Sin categoría", aliados && p.ally_id ? `de ${nombreDelAliado(p.ally_id, aliados)}` : null].filter(Boolean).join(" · ");
  const productoAbierto = abierto && abierto !== "nuevo" ? todos.find((p) => p.id === abierto) : undefined;
  const hayFiltros = Boolean(q || aliado || categoria);

  const columns: Column<Producto>[] = [
    {
      key: "producto",
      header: "Producto",
      cell: (p) => (
        <div className="flex min-w-0 items-center gap-3">
          <FotoProducto url={p.image_url} nombre={p.name} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-headline">{p.name}</span>
            <span className="truncate text-xs text-text-soft">{detalle(p)}</span>
          </div>
        </div>
      ),
    },
    { key: "inventario", header: "Inventario", cell: (p) => <span className="text-body">{inventarioEnPalabras(p.variants).texto}</span> },
    {
      key: "aviso",
      header: <span className="sr-only">Aviso</span>,
      cell: (p) => {
        const aviso = inventarioEnPalabras(p.variants).aviso;
        return aviso ? <Badge variant={aviso.tono}>{aviso.label}</Badge> : null;
      },
    },
    {
      key: "precio",
      header: "Precio",
      align: "right",
      cell: (p) => <span className="font-medium tabular-nums text-headline">{formatMoney(p.price, moneda)}</span>,
    },
  ];

  const vacio = hayFiltros ? (
    <EmptyState title="No hay productos con ese filtro" description="Prueba con otra palabra o quita los filtros." />
  ) : (
    <EmptyState
      title="Agrega tu primer producto"
      description="Con nombre, foto y precio el asistente ya puede ofrecerlo. O súbelos todos desde un archivo en «Más»."
      action={
        <Link href={hrefProductos({ ...filtros, producto: "nuevo" })} scroll={false} className="text-sm font-medium text-link hover:underline">
          Nuevo producto
        </Link>
      }
    />
  );

  return (
    <div className="flex flex-col gap-6">
      {header(<AccionesDeProductos filtros={filtros} aliados={aliados} agentes={especialistas} />)}
      <RecordarVista lista="productos" vista={vista} />
      {/* VEN-09: el aviso de datos de prueba solo cuando se pueden generar. */}
      {datosPruebaRes.ok && datosPruebaRes.data.disponible && <DatosDePruebaDelModulo modulo="ventas" estado={datosPruebaRes.data} />}
      <FiltrosDeProductos filtros={filtros} aliados={aliados} vista={vista} guardada={guardada} nombreDeCategoria={nombreDeCategoria} />

      {vista === "vitrina" ? (
        productos.length === 0 ? (
          <div className="rounded-lg border border-border-soft bg-surface">{vacio}</div>
        ) : (
          <ul aria-label="Vitrina de productos" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-4">
            {productos.map((p) => {
              const inventario = inventarioEnPalabras(p.variants);
              const promo = promoDelProducto(p, promos, categorias);
              return (
                <li key={p.id} className="relative flex flex-col gap-2.5 rounded-lg border border-border-soft bg-surface p-2.5 transition-colors hover:border-border sm:p-3">
                  <FotoProducto url={p.image_url} nombre={p.name} size="vitrina" />
                  <div className="flex min-w-0 flex-col gap-0.5 px-1">
                    <Link
                      href={hrefDe(p)}
                      scroll={false}
                      className="truncate font-medium text-headline outline-none after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-focus"
                    >
                      {p.name}
                    </Link>
                    <span className="truncate text-xs text-text-soft">{detalle(p)}</span>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-1">
                    <span className="font-semibold tabular-nums text-headline">{formatMoney(p.price, moneda)}</span>
                    <span className="text-xs text-body">{inventario.texto}</span>
                  </div>
                  {(promo || inventario.aviso) && (
                    <div className="flex flex-wrap gap-1.5 px-1 pb-1">
                      {promo && <Badge variant="info">{etiquetaDePromo(promo)}</Badge>}
                      {inventario.aviso && <Badge variant={inventario.aviso.tono}>{inventario.aviso.label}</Badge>}
                    </div>
                  )}
                </li>
              );
            })}
            <li>
              <Link
                href={hrefProductos({ ...filtros, producto: "nuevo" })}
                scroll={false}
                className="flex h-full min-h-48 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border p-4 text-center text-sm text-body hover:bg-hover focus-visible:outline-2 focus-visible:outline-focus"
              >
                <Plus className="h-5 w-5 text-text-soft" aria-hidden />
                <span className="font-medium text-headline">Nuevo producto</span>
                <span className="text-xs text-text-soft">Con foto y precio basta</span>
              </Link>
            </li>
          </ul>
        )
      ) : productos.length === 0 ? (
        <div className="rounded-lg border border-border-soft bg-surface">{vacio}</div>
      ) : (
        <TablaResponsiva
          etiqueta="Productos"
          caption="Productos"
          columns={columns}
          rows={productos}
          getRowKey={(p) => p.id}
          getRowHref={hrefDe}
          getRowLabel={(p) => `Abrir la ficha de ${p.name}`}
          scrollAlAbrir={false}
          emptyTitle="Sin productos"
          filaCelular={(p) => {
            const inventario = inventarioEnPalabras(p.variants);
            return {
              inicio: <FotoProducto url={p.image_url} nombre={p.name} />,
              titulo: p.name,
              detalle: [inventario.texto, inventario.aviso?.label].filter(Boolean).join(" · "),
              fin: formatMoney(p.price, moneda),
              href: hrefDe(p),
            };
          }}
        />
      )}

      {(productoAbierto || abierto === "nuevo") && (
        <FichaDeProducto
          key={productoAbierto?.id ?? "nuevo"}
          producto={productoAbierto}
          categorias={categorias}
          aliados={aliados}
          moneda={moneda}
          alCerrar={hrefProductos(filtros)}
        />
      )}
    </div>
  );
}
