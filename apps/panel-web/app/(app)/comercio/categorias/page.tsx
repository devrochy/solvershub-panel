import Link from "next/link";
import { cookies } from "next/headers";
import { LayoutGrid, List, Plus } from "lucide-react";

import { AccionesDeCategoria, EditorDeCategoria, MoverCategoria } from "@/app/(app)/comercio/categorias/_components/category-dialog";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { RecordarVista } from "@/components/domain/recordar-vista";
import { FotoProducto } from "@/components/comercio/foto-producto";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { apiFetch } from "@/lib/api/server";
import { cn } from "@/lib/utils";
import { arbolDeCategorias, conSubcategorias, cuantosProductos, hrefCategoria, hrefProductos, type Categoria } from "@/lib/ventas";
import { VISTAS, vistaElegida, vistaEnEnlace } from "@/lib/vista-guardada";

export const metadata = { title: "Categorías" };

type Producto = { id: string; name: string; category_id: string | null; image_url?: string | null };

/**
 * Categorías (VEN-10 y 13): el árbol con cuántos productos tiene cada una, flechas para ordenarlas y
 * sus acciones en «Más acciones». En vitrina, una tarjeta por categoría principal con sus fotos.
 */
export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ categoria?: string; vista?: string }> }) {
  const [sp, jar, res, productosRes] = await Promise.all([
    searchParams,
    cookies(),
    apiFetch<Categoria[]>("/pack/commerce/categories"),
    apiFetch<Producto[]>("/pack/commerce/products"),
  ]);
  const guardada = jar.get(VISTAS.categorias.cookie)?.value;
  const vista = vistaElegida("categorias", sp.vista, guardada);
  const enlace = (v: string) => vistaEnEnlace("categorias", v, guardada);
  const alCerrar = `/comercio/categorias${enlace(vista) ? `?vista=${enlace(vista)}` : ""}`;

  const header = (
    <PageHeader
      title="Categorías"
      description="Cómo se agrupa el catálogo. El asistente las usa para filtrar y sugerir productos."
      helpSection="ventas"
      actions={
        <Button asChild variant="accent">
          <Link href={hrefCategoria("nueva", enlace(vista))} scroll={false}>
            <Plus className="h-4 w-4" aria-hidden /> Nueva categoría
          </Link>
        </Button>
      }
    />
  );
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorDeCarga titulo="No pudimos cargar las categorías" detalle={res.error} />
      </div>
    );
  }
  const categorias = res.data;
  const productos = productosRes.ok ? productosRes.data : [];
  const arbol = arbolDeCategorias(categorias, productos);
  const hijas = (id: string) => categorias.filter((c) => c.parent_id === id).length;
  const abierta = sp.categoria === "nueva" ? "nueva" : categorias.find((c) => c.id === sp.categoria);

  return (
    <div className="flex flex-col gap-6">
      {header}
      <RecordarVista lista="categorias" vista={vista} />
      {categorias.length > 0 && (
        <SegmentedControl
          label="Cómo ver las categorías"
          value={vista}
          options={[
            { value: "lista", label: "Lista", icon: List, href: `/comercio/categorias${enlace("lista") ? `?vista=${enlace("lista")}` : ""}` },
            { value: "vitrina", label: "Vitrina", icon: LayoutGrid, href: `/comercio/categorias${enlace("vitrina") ? `?vista=${enlace("vitrina")}` : ""}` },
          ]}
          className="self-end"
        />
      )}

      {categorias.length === 0 ? (
        <div className="rounded-lg border border-border-soft bg-surface">
          <EmptyState
            title="Aún no hay categorías"
            description="Agrupa el catálogo (Ropa, Accesorios…) para que el asistente filtre y sugiera mejor."
          />
        </div>
      ) : vista === "vitrina" ? (
        <ul aria-label="Vitrina de categorías" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {arbol
            .filter((n) => n.nivel === 0)
            .map(({ categoria, productos: cuantos }) => {
              const ids = conSubcategorias(categoria.id, categorias);
              const fotos = productos.filter((p) => p.category_id && ids.has(p.category_id)).slice(0, 4);
              const subs = categorias.filter((c) => c.parent_id === categoria.id);
              return (
                <li key={categoria.id} className={cn("relative flex flex-col gap-3 rounded-lg border border-border-soft bg-surface p-3", !categoria.active && "opacity-70")}>
                  <div className="grid grid-cols-4 gap-1.5" aria-hidden>
                    {Array.from({ length: 4 }, (_, i) =>
                      fotos[i] ? (
                        <FotoProducto key={fotos[i].id} url={fotos[i].image_url} nombre={fotos[i].name} size="vitrina" />
                      ) : (
                        <span key={i} className="aspect-[4/3] w-full rounded-lg bg-surface-raised" />
                      ),
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-2 px-1">
                    <div className="flex min-w-0 flex-col">
                      <Link
                        href={hrefProductos({ categoria: categoria.id })}
                        className="truncate font-medium text-headline outline-none after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-focus"
                      >
                        {categoria.name}
                      </Link>
                      <span className="text-sm text-body">{cuantosProductos(cuantos)}</span>
                    </div>
                    <div className="relative z-10 flex items-center gap-1">
                      {!categoria.active && <Badge variant="neutral">Pausada</Badge>}
                      <AccionesDeCategoria categoria={categoria} productos={cuantos} subcategorias={subs.length} vista={enlace(vista)} />
                    </div>
                  </div>
                  {subs.length > 0 && <p className="px-1 pb-1 text-xs text-text-soft">{subs.map((s) => s.name).join(" · ")}</p>}
                </li>
              );
            })}
        </ul>
      ) : (
        <ul aria-label="Categorías" className="overflow-hidden rounded-lg border border-border-soft bg-surface">
          {arbol.map(({ categoria, nivel, productos: cuantos, anterior, siguiente }) => (
            <li
              key={categoria.id}
              className={cn("relative flex min-h-14 items-center gap-3 border-b border-border-soft py-2 pr-2 last:border-b-0", !categoria.active && "text-text-soft")}
              style={{ paddingLeft: `${16 + nivel * 28}px` }}
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <Link
                  href={hrefCategoria(categoria.id, enlace(vista))}
                  scroll={false}
                  aria-label={`Editar ${categoria.name}`}
                  className={cn(
                    "truncate font-medium outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus",
                    categoria.active ? "text-headline" : "text-text-soft",
                  )}
                >
                  {categoria.name}
                </Link>
                <span className="text-xs text-text-soft">
                  {categoria.active ? cuantosProductos(cuantos) : `Pausada: el asistente no la ofrece · ${cuantosProductos(cuantos).toLowerCase()}`}
                </span>
              </div>
              <div className="relative z-10 flex items-center gap-1">
                <MoverCategoria categoria={categoria} anterior={anterior} siguiente={siguiente} />
                <AccionesDeCategoria categoria={categoria} productos={cuantos} subcategorias={hijas(categoria.id)} vista={enlace(vista)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {abierta && (
        <EditorDeCategoria
          key={abierta === "nueva" ? "nueva" : abierta.id}
          categoria={abierta === "nueva" ? undefined : abierta}
          categorias={categorias}
          alCerrar={alCerrar}
        />
      )}
    </div>
  );
}
