"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Product = {
  id: string;
  name: string;
  description: string;
  category_id: string | null;
  price: number;
  variants: { sku: string; stock: number }[];
};

/** Alta/edición de producto del pack de Comercio. */
export function ProductDialog({
  product,
  categories,
}: {
  product?: Product;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});
  const variant = product?.variants[0];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus({ loading: true });
    const res = await fetch("/api/pack/commerce/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: product?.id ?? null,
        name: String(data.get("name") ?? ""),
        description: String(data.get("description") ?? ""),
        category_id: String(data.get("category_id") ?? "") || null,
        sku: String(data.get("sku") ?? ""),
        price: Number(data.get("price") ?? 0),
        stock: Number(data.get("stock") ?? 0),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo guardar el producto." });
      return;
    }
    setStatus({});
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {product ? (
          <Button variant="outline" size="sm">
            Editar
          </Button>
        ) : (
          <Button variant="accent">Nuevo producto</Button>
        )}
      </DialogTrigger>
      <DialogContent
        title={product ? "Editar producto" : "Nuevo producto"}
        description="Nombre, categoría, precio y stock de la variante por defecto."
        className="max-w-xl"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="p-name" required>
              <Input id="p-name" name="name" required defaultValue={product?.name ?? ""} />
            </Field>
            <Field label="Categoría" htmlFor="p-cat">
              <Select id="p-cat" name="category_id" defaultValue={product?.category_id ?? ""}>
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Descripción" htmlFor="p-desc">
            <Input id="p-desc" name="description" defaultValue={product?.description ?? ""} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="SKU" htmlFor="p-sku" help="Vacío = se genera.">
              <Input id="p-sku" name="sku" defaultValue={variant?.sku ?? ""} />
            </Field>
            <Field label="Precio" htmlFor="p-price">
              <Input
                id="p-price"
                name="price"
                type="number"
                step="0.01"
                min={0}
                defaultValue={product?.price ?? 0}
              />
            </Field>
            <Field label="Stock" htmlFor="p-stock">
              <Input id="p-stock" name="stock" type="number" min={0} defaultValue={variant?.stock ?? 0} />
            </Field>
          </div>

          <FormFeedback error={status.error} />

          <div className="mt-2 flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="accent" disabled={status.loading}>
              {status.loading ? "Guardando…" : "Guardar producto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
