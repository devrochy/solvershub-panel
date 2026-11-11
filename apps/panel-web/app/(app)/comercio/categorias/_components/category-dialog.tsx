"use client";

import { useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";

import { MenuDeFila } from "@/components/domain/menu-de-fila";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenuItem, DropdownMenuLinkItem } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAction } from "@/lib/use-action";
import { cuantosProductos, hrefCategoria, hrefProductos, type Categoria } from "@/lib/ventas";

async function guardarCategoria(cuerpo: { category_id: string | null; name: string; parent_id: string | null; sort_order: number }) {
  const res = await fetch("/api/pack/commerce/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: res.ok, status: res.status, error: json.error };
}

/**
 * Crear o renombrar una categoría (VEN-10). El orden ya no se escribe: la nueva va al final de sus
 * hermanas y se mueve con las flechas de la lista.
 */
export function EditorDeCategoria({
  categoria,
  categorias,
  alCerrar,
}: {
  categoria?: Categoria;
  categorias: Categoria[];
  alCerrar: string;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<{ guardando?: boolean; error?: string }>({});
  const cerrar = () => router.replace(alCerrar, { scroll: false });
  // No puede quedar dentro de sí misma ni de una de sus hijas.
  const descendientes = new Set<string>(categoria ? [categoria.id] : []);
  for (let crecio = true; crecio; ) {
    crecio = false;
    for (const c of categorias) {
      if (c.parent_id && descendientes.has(c.parent_id) && !descendientes.has(c.id)) {
        descendientes.add(c.id);
        crecio = true;
      }
    }
  }
  const madres = categorias.filter((c) => !descendientes.has(c.id));

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const madre = String(data.get("parent_id") ?? "") || null;
    const hermanas = categorias.filter((c) => (c.parent_id ?? null) === madre && c.id !== categoria?.id);
    const mismaMadre = categoria && (categoria.parent_id ?? null) === madre;
    setEstado({ guardando: true });
    const r = await guardarCategoria({
      category_id: categoria?.id ?? null,
      name: String(data.get("name") ?? "").trim(),
      parent_id: madre,
      sort_order: mismaMadre ? categoria.sort_order : Math.max(0, ...hermanas.map((c) => c.sort_order + 1)),
    });
    if (!r.ok) {
      setEstado({ error: r.error ?? "No se pudo guardar la categoría." });
      return;
    }
    setEstado({});
    cerrar();
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && cerrar()}>
      <DialogContent title={categoria ? `Editar ${categoria.name}` : "Nueva categoría"} className="max-w-md">
        <form onSubmit={guardar} className="flex flex-col gap-4">
          <Field label="Nombre" htmlFor="c-name" required>
            <Input id="c-name" name="name" required maxLength={120} defaultValue={categoria?.name ?? ""} />
          </Field>
          <Field label="Dentro de" htmlFor="c-parent" help="Una subcategoría hereda las promociones de su categoría, si así se eligen.">
            <Select id="c-parent" name="parent_id" defaultValue={categoria?.parent_id ?? ""}>
              <option value="">Ninguna (categoría principal)</option>
              {madres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <FormFeedback error={estado.error} />
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" variant="accent" loading={estado.guardando}>
              {categoria ? "Guardar categoría" : "Crear categoría"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Subir o bajar una categoría entre sus hermanas: intercambia su lugar con la vecina. */
export function MoverCategoria({ categoria, anterior, siguiente }: { categoria: Categoria; anterior: Categoria | null; siguiente: Categoria | null }) {
  const { run, pending } = useAction();

  function mover(vecina: Categoria, sube: boolean) {
    void run(async () => {
      // Con el mismo número de orden, la que sube queda una antes que la vecina.
      const mio = vecina.sort_order === categoria.sort_order ? (sube ? Math.max(0, vecina.sort_order - 1) : vecina.sort_order + 1) : vecina.sort_order;
      const suyo = vecina.sort_order === categoria.sort_order ? vecina.sort_order : categoria.sort_order;
      for (const [c, orden] of [
        [categoria, mio],
        [vecina, suyo],
      ] as const) {
        const r = await guardarCategoria({ category_id: c.id, name: c.name, parent_id: c.parent_id, sort_order: orden });
        if (!r.ok) return { ok: false, status: r.status, error: r.error ?? "No se pudo cambiar el orden." };
      }
      return { ok: true };
    });
  }

  return (
    <span className="flex items-center">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Subir ${categoria.name}`}
        disabled={!anterior || pending}
        onClick={() => anterior && mover(anterior, true)}
        className="pointer-coarse:h-11 pointer-coarse:w-11"
      >
        <ArrowUp className="h-4 w-4" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Bajar ${categoria.name}`}
        disabled={!siguiente || pending}
        onClick={() => siguiente && mover(siguiente, false)}
        className="pointer-coarse:h-11 pointer-coarse:w-11"
      >
        <ArrowDown className="h-4 w-4" aria-hidden />
      </Button>
    </span>
  );
}

/** «Más acciones» de una categoría: editar y eliminar (con lo que pasa con sus productos). */
export function AccionesDeCategoria({
  categoria,
  productos,
  subcategorias,
  vista,
}: {
  categoria: Categoria;
  productos: number;
  subcategorias: number;
  vista: string;
}) {
  const { run } = useAction();
  const confirmar = useConfirm();

  async function eliminar() {
    const partes = [
      productos > 0 ? `${cuantosProductos(productos)} quedan sin categoría` : null,
      subcategorias > 0 ? `${subcategorias === 1 ? "su subcategoría pasa" : `sus ${subcategorias} subcategorías pasan`} a ser principal${subcategorias === 1 ? "" : "es"}` : null,
    ].filter(Boolean);
    const ok = await confirmar({
      title: `¿Eliminar ${categoria.name}?`,
      description: `${partes.length ? `${partes.join(" y ")}.`.replace(/^./, (l) => l.toUpperCase()) : "No tiene productos."} El asistente deja de usarla para filtrar y sugerir.`,
      confirmLabel: "Eliminar categoría",
      destructive: true,
    });
    if (!ok) return;
    void run(async () => {
      const res = await fetch(`/api/pack/commerce/categories/${encodeURIComponent(categoria.id)}/delete`, { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return res.ok ? { ok: true, success: `${categoria.name} eliminada.` } : { ok: false, status: res.status, error: json.error ?? "No se pudo eliminar." };
    });
  }

  return (
    <MenuDeFila etiqueta={`Más acciones de ${categoria.name}`}>
      <DropdownMenuLinkItem href={hrefCategoria(categoria.id, vista)} scroll={false}>
        Editar
      </DropdownMenuLinkItem>
      <DropdownMenuLinkItem href={hrefProductos({ categoria: categoria.id })}>
        Ver sus productos
      </DropdownMenuLinkItem>
      <DropdownMenuItem tone="danger" onSelect={() => void eliminar()}>
        Eliminar categoría
      </DropdownMenuItem>
    </MenuDeFila>
  );
}
