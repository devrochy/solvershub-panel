"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, FileSpreadsheet, LayoutGrid, List, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { CsvImportDialog } from "@/app/(app)/comercio/productos/_components/csv-import-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SearchInput } from "@/components/ui/search-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { SIN_ALIADO } from "@/lib/aliados";
import { hrefProductos, type FiltrosProductos } from "@/lib/ventas";
import { vistaEnEnlace } from "@/lib/vista-guardada";

/** Acciones de Productos (VEN-08): «Nuevo producto» es la principal; importar va en «Más». */
export function AccionesDeProductos({ filtros, aliados }: { filtros: FiltrosProductos; aliados: { id: string; name: string }[] | null }) {
  const [importar, setImportar] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            Más <ChevronDown className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem icon={<FileSpreadsheet />} onSelect={() => setImportar(true)}>
            Importar desde un archivo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button asChild variant="accent">
        <Link href={hrefProductos({ ...filtros, producto: "nuevo" })} scroll={false}>
          <Plus className="h-4 w-4" aria-hidden /> Nuevo producto
        </Link>
      </Button>
      <CsvImportDialog allies={aliados} open={importar} onOpenChange={setImportar} />
    </div>
  );
}

/**
 * Filtros de Productos (VEN-08): buscar por nombre mientras se escribe, el aliado al elegirlo (sin
 * botón «Filtrar») y la vista: lista o vitrina. Todo viaja en la URL.
 */
export function FiltrosDeProductos({
  filtros,
  aliados,
  vista,
  guardada,
  nombreDeCategoria = null,
}: {
  /** Los de la URL; `vista` es la que va en los enlaces (vacía si es la guardada). */
  filtros: FiltrosProductos;
  aliados: { id: string; name: string }[] | null;
  /** La vista que se está viendo. */
  vista: string;
  /** La vista guardada en este navegador. */
  guardada: string | undefined;
  /** Con `?categoria=` (desde Categorías), su nombre para el chip que la quita. */
  nombreDeCategoria?: string | null;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(filtros.q ?? "");
  const ultimo = useRef(filtros.q ?? "");
  const base = { ...filtros, producto: "" };
  const ir = (f: FiltrosProductos) => router.replace(hrefProductos(f), { scroll: false });

  useEffect(() => {
    if (texto.trim() === ultimo.current) return;
    const espera = setTimeout(() => {
      ultimo.current = texto.trim();
      ir({ ...base, q: texto });
    }, 300);
    return () => clearTimeout(espera);
    // `base` cambia con cada render; solo importa el texto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form role="search" className="w-full sm:w-72" onSubmit={(e) => e.preventDefault()}>
        <SearchInput label="Buscar un producto" value={texto} onChange={setTexto} placeholder="Buscar un producto" />
      </form>
      {aliados && (
        <Select
          aria-label="Aliado"
          className="w-full sm:w-56"
          value={filtros.aliado ?? ""}
          onChange={(e) => ir({ ...base, aliado: e.target.value })}
        >
          <option value="">Todos los aliados</option>
          <option value={SIN_ALIADO}>Los que vendo yo</option>
          {aliados.map((a) => (
            <option key={a.id} value={a.id}>
              De {a.name}
            </option>
          ))}
        </Select>
      )}
      <SegmentedControl
        label="Cómo ver los productos"
        value={vista}
        options={[
          { value: "lista", label: "Lista", icon: <List />, href: hrefProductos({ ...base, vista: vistaEnEnlace("productos", "lista", guardada) }) },
          { value: "vitrina", label: "Vitrina", icon: <LayoutGrid />, href: hrefProductos({ ...base, vista: vistaEnEnlace("productos", "vitrina", guardada) }) },
        ]}
        className="sm:ml-auto"
      />
      {filtros.categoria && (
        <Link
          href={hrefProductos({ ...base, categoria: "" })}
          aria-label={`Quitar el filtro de categoría${nombreDeCategoria ? ` ${nombreDeCategoria}` : ""}`}
          className="inline-flex w-full items-center gap-1.5 self-start rounded-full bg-hover px-3 py-1 text-sm text-body hover:underline focus-visible:outline-2 focus-visible:outline-focus sm:w-auto"
        >
          En {nombreDeCategoria ?? "una categoría"} y sus subcategorías
          <X className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
