"use client";

import { useState, type FormEvent } from "react";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

import { FotoProducto } from "@/components/comercio/foto-producto";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { InputNumero } from "@/components/ui/input-numero";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { FOTO_URL_MAX, esFotoValida } from "@/lib/foto-producto";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { inventarioEnPalabras, nombreDeVariante, POCAS_UNIDADES, type Variante } from "@/lib/ventas";

export type ProductoVenta = {
  id: string;
  name: string;
  description: string;
  category_id: string | null;
  ally_id?: string | null;
  price: number;
  image_url?: string | null;
  image_url_externa?: string | null;
  image_key?: string | null;
  variants: (Variante & { id?: string })[];
};

const TIPOS_DE_FOTO = ["image/png", "image/jpeg", "image/webp"];
const FOTO_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Ficha de un producto en un cajón (VEN-07): foto para arrastrar, nombre, categoría, precio y sus
 * tallas y colores. La API guarda la variante principal (precio, stock y código), así que con
 * varias variantes el precio y el stock se rotulan como de esa variante; el código (SKU) y el link
 * de la foto quedan en «Avanzado».
 */
export function FichaDeProducto({
  producto,
  categorias,
  aliados = null,
  moneda = "COP",
  alCerrar,
}: {
  /** Sin producto, es uno nuevo. */
  producto?: ProductoVenta;
  categorias: { id: string; name: string }[];
  /** HU-CRM-03: `null` = aliados apagados; el producto se guarda sin tocar su aliado. */
  aliados?: { id: string; name: string }[] | null;
  moneda?: string;
  alCerrar: string;
}) {
  const router = useRouter();
  const principal = producto?.variants[0];
  const varias = (producto?.variants.length ?? 0) > 1;
  const nombrePrincipal = principal ? nombreDeVariante(principal.attributes) : "";
  const [foto, setFoto] = useState(producto?.image_url_externa ?? "");
  const [imageKey, setImageKey] = useState(producto?.image_key ?? "");
  const [preview, setPreview] = useState(producto?.image_url ?? producto?.image_url_externa ?? "");
  const [subiendo, setSubiendo] = useState(false);
  const [precio, setPrecio] = useState(producto?.price ?? 0);
  const [stock, setStock] = useState(principal?.stock ?? 0);
  const [avanzado, setAvanzado] = useState(false);
  const [estado, setEstado] = useState<{ guardando?: boolean; error?: string }>({});
  const fotoInvalida = foto.trim() !== "" && !esFotoValida(foto);

  const cerrar = () => router.replace(alCerrar, { scroll: false });

  async function subir(archivo: File) {
    setSubiendo(true);
    setEstado({});
    const form = new FormData();
    form.append("archivo", archivo);
    const res = await fetch("/api/pack/commerce/products/image", { method: "POST", body: form });
    const json = (await res.json().catch(() => ({}))) as { error?: string; image_key?: string; image_url?: string };
    setSubiendo(false);
    if (!res.ok || !json.image_key) {
      setEstado({ error: json.error ?? "No se pudo subir la foto. Prueba con otra o vuelve a intentarlo." });
      return;
    }
    setImageKey(json.image_key);
    setPreview(json.image_url ?? "");
  }

  function quitarFoto() {
    setImageKey("");
    setFoto("");
    setPreview("");
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (fotoInvalida) {
      setAvanzado(true);
      setEstado({ error: "El link de la foto tiene que empezar por https://" });
      return;
    }
    setEstado({ guardando: true });
    const res = await fetch("/api/pack/commerce/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: producto?.id ?? null,
        name: String(data.get("name") ?? "").trim(),
        description: String(data.get("description") ?? "").trim(),
        category_id: String(data.get("category_id") ?? "") || null,
        ...(aliados ? { ally_id: String(data.get("ally_id") ?? "") || null } : {}),
        sku: String(data.get("sku") ?? principal?.sku ?? ""),
        price: precio,
        stock,
        // "" quita el link externo (HU-CRM-01); `image_key` (HU-CRM-05) gana si está.
        image_url: foto.trim(),
        image_key: imageKey,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setEstado({ error: json.error ?? "No se pudo guardar el producto." });
      return;
    }
    setEstado({});
    cerrar();
    router.refresh();
  }

  const inventario = producto ? inventarioEnPalabras(producto.variants) : null;
  return (
    <Sheet open onOpenChange={(abierto) => !abierto && cerrar()}>
      <SheetContent
        title={producto?.name || "Nuevo producto"}
        description={producto ? inventario?.texto : "Con nombre, foto y precio el asistente ya puede ofrecerlo."}
        footer={
          <>
            <Button type="button" variant="outline" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" form="ficha-producto" variant="accent" loading={estado.guardando} disabled={subiendo}>
              Guardar producto
            </Button>
          </>
        }
        className="sm:max-w-lg"
      >
        <form id="ficha-producto" onSubmit={guardar} className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <div aria-live="polite">
              <FotoProducto url={preview} nombre={producto?.name || "el producto"} size="lg" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Dropzone
                accept={TIPOS_DE_FOTO}
                maxBytes={FOTO_MAX_BYTES}
                disabled={subiendo}
                label={subiendo ? "Subiendo la foto…" : preview ? "Cambiar la foto" : "Arrastra una foto o elígela"}
                hint="JPG, PNG o WebP hasta 5 MB. El asistente la envía cuando la piden."
                onFiles={(archivos) => void subir(archivos[0])}
                onReject={(motivo) => setEstado({ error: motivo })}
              />
              {preview && (
                <Button type="button" variant="ghost" size="sm" className="self-start" onClick={quitarFoto}>
                  Quitar la foto
                </Button>
              )}
            </div>
          </div>

          <Field label="Nombre" htmlFor="p-name" required>
            <Input id="p-name" name="name" required maxLength={200} defaultValue={producto?.name ?? ""} />
          </Field>
          <Field label="Descripción" htmlFor="p-desc" help="El asistente la usa para contar el producto.">
            <Textarea id="p-desc" name="description" rows={2} defaultValue={producto?.description ?? ""} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoría" htmlFor="p-cat">
              <Select id="p-cat" name="category_id" defaultValue={producto?.category_id ?? ""}>
                <option value="">Sin categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            {aliados && (
              <Field label="Aliado" htmlFor="p-ally" help="Una promoción de un aliado solo aplica a sus productos.">
                <Select id="p-ally" name="ally_id" defaultValue={producto?.ally_id ?? ""}>
                  <option value="">Lo vendo yo</option>
                  {aliados.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Precio" htmlFor="p-price" help={varias ? `De ${nombrePrincipal}. Las demás tallas y colores conservan el suyo.` : formatMoney(precio, moneda)}>
              <InputNumero id="p-price" value={precio} onValueChange={setPrecio} min={0} decimal={moneda !== "COP"} />
            </Field>
            <Field label={varias ? `Stock de ${nombrePrincipal}` : "Stock"} htmlFor="p-stock" help="Unidades disponibles.">
              <InputNumero id="p-stock" value={stock} onValueChange={setStock} min={0} />
            </Field>
          </div>

          {varias && producto && (
            <section className="flex flex-col gap-1" aria-labelledby="p-variantes">
              <h3 id="p-variantes" className="text-sm font-medium text-headline">
                Tallas y colores
              </h3>
              <ul className="flex flex-col">
                {producto.variants.map((v, i) => (
                  <li key={v.id ?? `${v.sku}-${i}`} className={cn("flex items-center justify-between gap-3 border-t border-border-soft py-2 text-sm", !v.active && "opacity-60")}>
                    <span className="text-body">{nombreDeVariante(v.attributes)}</span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums text-body">{formatMoney(v.price, moneda)}</span>
                      {!v.active ? (
                        <Badge variant="neutral">No se ofrece</Badge>
                      ) : v.stock <= 0 ? (
                        <Badge variant="danger">Agotada</Badge>
                      ) : (
                        <Badge variant={v.stock <= POCAS_UNIDADES ? "warning" : "neutral"}>{v.stock <= POCAS_UNIDADES ? `Quedan ${v.stock}` : `${v.stock} en stock`}</Badge>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-text-soft">Para agregar o cambiar tallas y colores, súbelos desde un archivo en «Más» › «Importar desde un archivo».</p>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <button
              type="button"
              aria-expanded={avanzado}
              aria-controls="avanzado-producto"
              onClick={() => setAvanzado((v) => !v)}
              className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2.5 text-left text-sm text-body hover:bg-hover focus-visible:outline-2 focus-visible:outline-focus"
            >
              Avanzado: código (SKU) y link de la foto
              <ChevronDown aria-hidden className={cn("h-4 w-4 text-text-soft transition-transform duration-150", avanzado && "rotate-180")} />
            </button>
            <div id="avanzado-producto" hidden={!avanzado} className="flex flex-col gap-4">
              <Field label={varias ? `Código (SKU) de ${nombrePrincipal}` : "Código (SKU)"} htmlFor="p-sku" help="Si lo dejas vacío, se genera solo.">
                <Input id="p-sku" name="sku" defaultValue={principal?.sku ?? ""} maxLength={80} />
              </Field>
              <Field
                label="Link de la foto"
                htmlFor="p-foto"
                help="Solo si no subiste una foto. Tiene que empezar por https://"
                error={fotoInvalida ? "El link tiene que empezar por https://" : undefined}
              >
                <Input
                  id="p-foto"
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
          </section>

          <FormFeedback error={estado.error} />
        </form>
      </SheetContent>
    </Sheet>
  );
}
