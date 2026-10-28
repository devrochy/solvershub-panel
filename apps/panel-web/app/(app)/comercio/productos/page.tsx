import Link from "next/link";

import { CsvImportDialog } from "@/app/(app)/comercio/productos/_components/csv-import-dialog";
import { ProductDialog } from "@/app/(app)/comercio/productos/_components/product-dialog";
import { DatosDePruebaDelModulo } from "@/components/domain/datos-de-prueba-modulo";
import { FotoProducto } from "@/components/comercio/foto-producto";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { SIN_ALIADO, filtroDeAliado, nombreDelAliado, type Aliado, type ModulosComercio } from "@/lib/aliados";
import { apiFetch, getBusinessCurrency } from "@/lib/api/server";
import type { EstadoDatosDePruebaModulo, MinimoPagoEnLineaOut } from "@/lib/api/types";
import { formatMoney, formatNumber } from "@/lib/format";
import { TIPOS_DE_PRODUCTO, filtrarPorTipo, planDelProducto } from "@/lib/suscripciones";

export const metadata = { title: "Productos" };

type Variant = {
  id: string;
  sku: string;
  attributes: Record<string, unknown>;
  price: number;
  stock: number;
  active: boolean;
  billing_period?: string | null;
  trial_days?: number | null;
};
type Product = {
  id: string;
  name: string;
  description: string;
  category_id: string | null;
  category: string;
  ally_id?: string | null;
  price: number;
  image_url?: string | null;
  image_url_externa?: string | null;
  image_key?: string | null;
  variants: Variant[];
};
type Category = { id: string; name: string; parent_id: string | null; sort_order: number; active: boolean };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ aliado?: string | string[]; tipo?: string }>;
}) {
  // HU-CRM-03: aliados solo si el master los encendió en el negocio.
  const modulos = await apiFetch<ModulosComercio>("/pack/commerce/modulos");
  const conAliados = modulos.ok && modulos.data.aliados;
  const sp = await searchParams;
  const filtro = conAliados ? filtroDeAliado(sp.aliado) : null;
  const tipo = TIPOS_DE_PRODUCTO.some((t) => t.value === sp.tipo) ? sp.tipo : undefined;
  const [productsRes, categoriesRes, alliesRes, minimoRes, datosPruebaRes] = await Promise.all([
    apiFetch<Product[]>(`/pack/commerce/products${filtro ? `?ally_id=${filtro}` : ""}`),
    apiFetch<Category[]>("/pack/commerce/categories"),
    conAliados ? apiFetch<Aliado[]>("/pack/commerce/allies") : Promise.resolve(null),
    apiFetch<MinimoPagoEnLineaOut>("/pack/commerce/pago-en-linea/minimo"),
    apiFetch<EstadoDatosDePruebaModulo>("/admin/datos-de-prueba/ventas"),
  ]);
  if (!productsRes.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar los productos: {productsRes.error}
      </p>
    );
  }
  const categories = categoriesRes.ok ? categoriesRes.data : [];
  // `null` = aliados apagados: ni columna, ni filtro, ni selector.
  const allies = conAliados ? (alliesRes?.ok ? alliesRes.data : []) : null;
  const products = filtrarPorTipo(productsRes.data, tipo);
  const currency = await getBusinessCurrency();
  // HU-SUB-25: si no se pudo saber el mínimo, el diálogo no avisa (mejor callar que inventar una cifra).
  const minimo = minimoRes.ok ? minimoRes.data : null;

  const columns: Column<Product>[] = [
    {
      key: "producto",
      header: "Producto",
      cell: (p) => (
        <div className="flex items-center gap-3">
          <FotoProducto url={p.image_url} nombre={p.name} />
          <div className="flex flex-col">
            <span className="flex flex-wrap items-center gap-2 text-headline">
              {p.name}
              {planDelProducto(p.variants) && <Badge variant="accent">{planDelProducto(p.variants)}</Badge>}
            </span>
            {p.description && <span className="text-xs text-text-soft">{p.description}</span>}
          </div>
        </div>
      ),
    },
    {
      key: "categoria",
      header: "Categoría",
      cell: (p) => <Badge variant="neutral">{p.category}</Badge>,
    },
    ...(allies
      ? [
          {
            key: "aliado",
            header: "Aliado",
            cell: (p: Product) => <span className="text-body">{nombreDelAliado(p.ally_id, allies)}</span>,
          },
        ]
      : []),
    {
      key: "variantes",
      header: "Variantes",
      cell: (p) => (
        <div className="flex flex-col gap-1 text-xs text-body">
          {p.variants.length === 0 ? (
            "—"
          ) : (
            p.variants.map((v) => (
              <span key={v.id} className="font-mono">
                {v.sku} · {formatMoney(v.price, currency)} · {formatNumber(v.stock)} en stock
                {v.billing_period ? ` · plan ${v.billing_period}` : ""}
              </span>
            ))
          )}
        </div>
      ),
    },
    {
      key: "precio",
      header: "Precio",
      align: "right",
      cell: (p) => formatMoney(p.price, currency),
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (p) => (
        <ProductDialog
          product={{
            ...p,
            variants: p.variants.map((v) => ({
              sku: v.sku,
              stock: v.stock,
              billing_period: v.billing_period,
              trial_days: v.trial_days,
            })),
          }}
          categories={categories}
          allies={allies}
          minimo={minimo}
          moneda={currency}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Productos"
        description="Catálogo del negocio: precio y stock de la variante por defecto."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {allies && (
              <Button asChild variant="outline">
                <Link href="/comercio/aliados">Aliados</Link>
              </Button>
            )}
            <CsvImportDialog allies={allies} />
            <ProductDialog categories={categories} allies={allies} minimo={minimo} moneda={currency} />
          </div>
        }
      />
      {datosPruebaRes.ok && (
        <DatosDePruebaDelModulo modulo="ventas" estado={datosPruebaRes.data} />
      )}
      <form method="get" className="flex flex-wrap items-end gap-3">
        <Field label="Tipo" htmlFor="filtro-tipo" className="w-56">
          <Select id="filtro-tipo" name="tipo" defaultValue={tipo ?? ""}>
            {TIPOS_DE_PRODUCTO.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        {allies && (
          <Field label="Aliado" htmlFor="filtro-aliado" className="w-64">
            <Select id="filtro-aliado" name="aliado" defaultValue={filtro ?? ""}>
              <option value="">Todos los aliados</option>
              <option value={SIN_ALIADO}>Sin aliado</option>
              {allies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {(filtro || tipo) && (
          <Link href="/comercio/productos" className="pb-2.5 text-sm text-link hover:underline">
            Limpiar
          </Link>
        )}
      </form>
      <DataTable
        columns={columns}
        rows={products}
        getRowKey={(p) => p.id}
        emptyTitle={tipo || filtro ? "Sin productos con ese filtro" : "Sin productos"}
        emptyDescription={
          tipo || filtro ? "Prueba con otro filtro." : "Agrega el primero para que el agente pueda cotizarlo."
        }
      />
    </div>
  );
}
