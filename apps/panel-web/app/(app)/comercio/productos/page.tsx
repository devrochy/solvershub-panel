import { CsvImportDialog } from "@/app/(app)/comercio/productos/_components/csv-import-dialog";
import { ProductDialog } from "@/app/(app)/comercio/productos/_components/product-dialog";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import { formatNumber, formatUsd } from "@/lib/format";

export const metadata = { title: "Productos" };

type Variant = { id: string; sku: string; attributes: Record<string, unknown>; price: number; stock: number; active: boolean };
type Product = {
  id: string;
  name: string;
  description: string;
  category_id: string | null;
  category: string;
  price: number;
  variants: Variant[];
};
type Category = { id: string; name: string; parent_id: string | null; sort_order: number; active: boolean };

export default async function ProductsPage() {
  const [productsRes, categoriesRes] = await Promise.all([
    apiFetch<Product[]>("/pack/commerce/products"),
    apiFetch<Category[]>("/pack/commerce/categories"),
  ]);
  if (!productsRes.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar los productos: {productsRes.error}
      </p>
    );
  }
  const categories = categoriesRes.ok ? categoriesRes.data : [];
  const products = productsRes.data;

  const columns: Column<Product>[] = [
    {
      key: "producto",
      header: "Producto",
      cell: (p) => (
        <div className="flex flex-col">
          <span className="text-headline">{p.name}</span>
          {p.description && <span className="text-xs text-text-soft">{p.description}</span>}
        </div>
      ),
    },
    {
      key: "categoria",
      header: "Categoría",
      cell: (p) => <Badge variant="neutral">{p.category}</Badge>,
    },
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
                {v.sku} · {formatUsd(v.price, 0)} · {formatNumber(v.stock)} en stock
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
      cell: (p) => formatUsd(p.price, 0),
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (p) => (
        <ProductDialog
          product={{ ...p, variants: p.variants.map((v) => ({ sku: v.sku, stock: v.stock })) }}
          categories={categories}
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
            <CsvImportDialog />
            <ProductDialog categories={categories} />
          </div>
        }
      />
      <DataTable
        columns={columns}
        rows={products}
        getRowKey={(p) => p.id}
        emptyTitle="Sin productos"
        emptyDescription="Agrega el primero para que el agente pueda cotizarlo."
      />
    </div>
  );
}
