"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
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

type Product = {
  id: string;
  name: string;
  description: string;
  category_id: string | null;
  ally_id?: string | null;
  price: number;
  image_url?: string | null;
  image_url_externa?: string | null;
  image_key?: string | null;
  variants: { sku: string; stock: number }[];
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
  const [foto, setFoto] = useState(product?.image_url_externa ?? "");
  const [imageKey, setImageKey] = useState(product?.image_key ?? "");
  const [preview, setPreview] = useState(product?.image_url ?? "");
  const [subiendo, setSubiendo] = useState(false);
  const fotoInvalida = foto.trim() !== "" && !esFotoValida(foto);
  const [precio, setPrecio] = useState(String(product?.price ?? 0));

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
        // "" quita el link externo (HU-CRM-01); `image_key` (HU-CRM-05) gana si está.
        image_url: foto.trim(),
        image_key: imageKey,
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

  async function subirFoto(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0];
    if (!archivo) return;
    setSubiendo(true);
    setStatus({});
    const form = new FormData();
    form.append("archivo", archivo);
    const res = await fetch("/api/pack/commerce/products/image", { method: "POST", body: form });
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      image_key?: string;
      image_url?: string;
    };
    setSubiendo(false);
    if (!res.ok || !json.image_key) {
      setStatus({ error: json.error ?? "No se pudo subir la foto." });
      return;
    }
    setImageKey(json.image_key);
    setPreview(json.image_url ?? "");
  }

  function quitarSubida() {
    setImageKey("");
    setPreview(foto);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        if (abierto) {
          const externa = product?.image_url_externa ?? "";
          setFoto(externa);
          setImageKey(product?.image_key ?? "");
          setPreview(product?.image_url ?? externa);
          setPrecio(String(product?.price ?? 0));
        }
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
          <div className="flex flex-col gap-3">
            <Field
              label="Subir foto"
              htmlFor="p-foto-file"
              help="JPG, PNG o WebP hasta 5 MB. El agente la envía cuando el cliente pide este producto."
            >
              <input
                id="p-foto-file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => void subirFoto(e)}
                disabled={subiendo}
                className="block w-full text-sm text-body file:mr-3 file:rounded-md file:border-0 file:bg-action file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary-hover disabled:opacity-50"
              />
            </Field>
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <Field
                  label="O un link (URL)"
                  htmlFor="p-foto"
                  help="Alternativa a la subida; se usa solo si no hay foto subida."
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
                    onChange={(e) => {
                      setFoto(e.target.value);
                      if (!imageKey) setPreview(e.target.value);
                    }}
                  />
                </Field>
              </div>
              <div className="pt-6" aria-live="polite">
                <FotoProducto url={preview} nombre={product?.name ?? "el producto"} size="lg" />
              </div>
            </div>
            {imageKey && (
              <div>
                <Button type="button" variant="ghost" size="sm" onClick={quitarSubida}>
                  Quitar foto subida
                </Button>
              </div>
            )}
            {subiendo && <p className="text-xs text-text-soft">Subiendo foto…</p>}
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
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
              />
            </Field>
            <Field label="Stock" htmlFor="p-stock">
              <Input id="p-stock" name="stock" type="number" min={0} defaultValue={variant?.stock ?? 0} />
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
