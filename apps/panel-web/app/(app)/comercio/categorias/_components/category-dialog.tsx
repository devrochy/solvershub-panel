"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Category = { id: string; name: string; parent_id: string | null; sort_order: number; active: boolean };

/** Alta/edición de categoría del catálogo. */
export function CategoryDialog({
  category,
  categories,
}: {
  category?: Category;
  categories: Category[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus({ loading: true });
    const res = await fetch("/api/pack/commerce/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category_id: category?.id ?? null,
        name: String(data.get("name") ?? ""),
        parent_id: String(data.get("parent_id") ?? "") || null,
        sort_order: Number(data.get("sort_order") ?? 0),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo guardar la categoría." });
      return;
    }
    setStatus({});
    setOpen(false);
    router.refresh();
  }

  const others = categories.filter((c) => c.id !== category?.id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {category ? (
          <Button aria-label="Editar" size="icon" title="Editar" variant="outline"><Pencil className="h-4 w-4" aria-hidden /></Button>
        ) : (
          <Button variant="accent">Nueva categoría</Button>
        )}
      </DialogTrigger>
      <DialogContent title={category ? "Editar categoría" : "Nueva categoría"} className="max-w-lg">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Nombre" htmlFor="c-name" required>
            <Input id="c-name" name="name" required defaultValue={category?.name ?? ""} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoría padre" htmlFor="c-parent">
              <Select id="c-parent" name="parent_id" defaultValue={category?.parent_id ?? ""}>
                <option value="">Sin padre (raíz)</option>
                {others.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Orden" htmlFor="c-order">
              <Input id="c-order" name="sort_order" type="number" defaultValue={category?.sort_order ?? 0} />
            </Field>
          </div>

          <FormFeedback error={status.error} />

          <div className="mt-2 flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" aria-label="Cancelar" size="icon" title="Cancelar" variant="outline"><X className="h-4 w-4" aria-hidden /></Button>
            </DialogClose>
            <Button type="submit" variant="accent" disabled={status.loading}>
              {status.loading ? "Guardando…" : "Guardar categoría"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Elimina (soft-delete) una categoría. */
export function DeleteCategoryButton({ categoryId, label }: { categoryId: string; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});

  async function remove() {
    setStatus({ loading: true });
    const res = await fetch(`/api/pack/commerce/categories/${categoryId}/delete`, { method: "POST" });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo eliminar." });
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button aria-label="Eliminar" size="icon" title="Eliminar" variant="outline"><Trash2 className="h-4 w-4 text-danger" aria-hidden /></Button>
      </DialogTrigger>
      <DialogContent title="Eliminar categoría" description={label} className="max-w-md">
        <p className="text-sm text-body">Los productos de esta categoría quedarán sin categoría.</p>
        <FormFeedback error={status.error} className="mt-3" />
        <div className="mt-6 flex justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" aria-label="Cancelar" size="icon" title="Cancelar" variant="outline"><X className="h-4 w-4" aria-hidden /></Button>
          </DialogClose>
          <Button type="button" variant="danger" onClick={() => void remove()} disabled={status.loading}>
            {status.loading ? "Eliminando…" : "Eliminar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
