"use client";

import { useState, type FormEvent } from "react";
import { Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FotoProducto } from "@/components/comercio/foto-producto";
import { FOTO_URL_MAX, esFotoValida } from "@/lib/foto-producto";
import { COBROS, cuerpoDelPlan } from "@/lib/suscripciones";

type Product = {
  id: string;
  name: string;
  description: string;
  category_id: string | null;
  ally_id?: string | null;
  price: number;
  image_url?: string | null;
  variants: { sku: string; stock: number; billing_period?: string | null; trial_days?: number | null }[];
};

/** Alta/edición de producto del pack de Comercio. */
export function ProductDialog({
  product,
  categories,
  allies = null,
}: {
  product?: Product;
  categories: { id: string; name: string }[];
  /** HU-CRM-03: `null` = aliados apagados; el producto se guarda sin tocar su aliado. */
  allies?: { id: string; name: string }[] | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});
  const variant = product?.variants[0];
  const [foto, setFoto] = useState(product?.image_url ?? "");
  const fotoInvalida = foto.trim() !== "" && !esFotoValida(foto);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (fotoInvalida) {
      setStatus({ error: "La foto tiene que ser un link https://" });
      return;
    }
    setStatus({ loading: true });
    const res = await fetch("/api/pack/commerce/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: product?.id ?? null,
        name: String(data.get("name") ?? ""),
        description: String(data.get("description") ?? ""),
        category_id: String(data.get("category_id") ?? "") || null,
        ...(allies ? { ally_id: String(data.get("ally_id") ?? "") || null } : {}),
        sku: String(data.get("sku") ?? ""),
        price: Number(data.get("price") ?? 0),
        stock: Number(data.get("stock") ?? 0),
        // "" quita la foto (HU-CRM-01).
        image_url: foto.trim(),
        ...cuerpoDelPlan(data),
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
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        if (abierto) setFoto(product?.image_url ?? "");
        setOpen(abierto);
      }}
    >
      <DialogTrigger asChild>
        {product ? (
          <Button aria-label="Editar" size="icon" title="Editar" variant="outline"><Pencil className="h-4 w-4" aria-hidden /></Button>
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
          {allies && (
            <Field label="Aliado" htmlFor="p-ally" help="Proveedor del producto. Una promoción del aliado solo aplica a sus productos.">
              <Select id="p-ally" name="ally_id" defaultValue={product?.ally_id ?? ""}>
                <option value="">Sin aliado</option>
                {allies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Descripción" htmlFor="p-desc">
            <Input id="p-desc" name="description" defaultValue={product?.description ?? ""} />
          </Field>
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <Field
                label="Foto (URL)"
                htmlFor="p-foto"
                help="Link https a la imagen. El agente la envía cuando el cliente pide este producto."
                error={fotoInvalida ? "Tiene que ser un link https://" : undefined}
              >
                <Input
                  id="p-foto"
                  name="image_url"
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  maxLength={FOTO_URL_MAX}
                  value={foto}
                  onChange={(e) => setFoto(e.target.value)}
                />
              </Field>
            </div>
            <div className="pt-6" aria-live="polite">
              <FotoProducto url={foto} nombre={product?.name ?? "el producto"} size="lg" />
            </div>
          </div>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Cobro"
              htmlFor="p-cobro"
              help="Un plan necesita la habilidad Suscripciones (cobro en línea) o Cobranza (cobro en campo)."
            >
              <Select id="p-cobro" name="billing_period" defaultValue={variant?.billing_period ?? ""}>
                {COBROS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Días de prueba" htmlFor="p-trial" help="Solo el plan Free ($0) tiene prueba.">
              <Input
                id="p-trial"
                name="trial_days"
                type="number"
                min={0}
                max={365}
                defaultValue={variant?.trial_days ?? ""}
              />
            </Field>
          </div>

          <FormFeedback error={status.error} />

          <div className="mt-2 flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" aria-label="Cancelar" size="icon" title="Cancelar" variant="outline"><X className="h-4 w-4" aria-hidden /></Button>
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
