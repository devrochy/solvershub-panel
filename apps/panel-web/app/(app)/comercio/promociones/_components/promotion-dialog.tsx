"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type Option = { id: string; name: string };

export type Promotion = {
  id: string;
  type: string;
  rules: Record<string, unknown>;
  active: boolean;
  valid_from: string | null;
  valid_to: string | null;
  category_id: string | null;
  product_id: string | null;
  ally_id?: string | null;
  include_child_categories: boolean;
  eligible_segments: string[] | null;
};

const TYPES = [
  { value: "temporada", label: "Temporada (descuento por fechas)" },
  { value: "volumen", label: "Volumen (escalones por cantidad)" },
  { value: "campaña", label: "Campaña (una vez por cliente)" },
];

const SEGMENTOS: { value: string; label: string }[] = [
  { value: "nuevo", label: "Nuevos" },
  { value: "ocasional", label: "Ocasionales" },
  { value: "frecuente", label: "Frecuentes" },
  { value: "fiel", label: "Fieles" },
  { value: "inactivo", label: "Inactivos" },
];

type Tier = { min: string; max: string; discount_pct: string; free_item_sku: string };

function isoToLocal(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 16);
}

function estadoVigencia(active: boolean, from: string, to: string): { label: string; tone: "neutral" | "success" | "warning" | "danger" } {
  if (!active) return { label: "Inactiva", tone: "neutral" };
  const ahora = Date.now();
  if (from && new Date(from).getTime() > ahora) return { label: "Programada", tone: "warning" };
  if (to && new Date(to).getTime() < ahora) return { label: "Vencida", tone: "danger" };
  return { label: "Activa", tone: "success" };
}

function presets(): { label: string; from: string; to: string }[] {
  const fmt = (d: Date) => {
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
  };
  const hoy = new Date();
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59);
  const en30 = new Date(hoy.getTime() + 30 * 86_400_000);
  const diaSemana = hoy.getDay();
  const viernes = new Date(hoy.getTime() + ((5 - diaSemana + 7) % 7) * 86_400_000);
  const domingo = new Date(viernes.getTime() + 2 * 86_400_000);
  return [
    { label: "Este mes", from: fmt(hoy), to: fmt(finMes) },
    { label: "Próximos 30 días", from: fmt(hoy), to: fmt(en30) },
    { label: "Fin de semana", from: fmt(viernes), to: fmt(domingo) },
  ];
}

/** Alta/edición interactiva de promoción (antes era un JSON crudo). */
export function PromotionDialog({
  promotion,
  categories,
  products,
  allies = null,
}: {
  promotion?: Promotion;
  categories: Option[];
  products: Option[];
  /** HU-CRM-03: `null` = aliados apagados; la promoción se guarda sin tocar su aliado. */
  allies?: Option[] | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});

  const reglas = (promotion?.rules ?? {}) as Record<string, unknown>;
  const [type, setType] = useState(promotion?.type ?? "temporada");
  const [label, setLabel] = useState(String(reglas.label ?? ""));
  const [discount, setDiscount] = useState(String(reglas.discount_pct ?? "10"));
  const [oncePerCustomer, setOncePerCustomer] = useState(Boolean(reglas.once_per_customer));
  const [tiers, setTiers] = useState<Tier[]>(
    Array.isArray(reglas.tiers) && reglas.tiers.length > 0
      ? (reglas.tiers as Record<string, unknown>[]).map((t) => ({
          min: String(t.min ?? ""),
          max: String(t.max ?? ""),
          discount_pct: String(t.discount_pct ?? ""),
          free_item_sku: String(t.free_item_sku ?? ""),
        }))
      : [{ min: "3", max: "", discount_pct: "10", free_item_sku: "" }],
  );
  const [validFrom, setValidFrom] = useState(isoToLocal(promotion?.valid_from));
  const [validTo, setValidTo] = useState(isoToLocal(promotion?.valid_to));
  const [scope, setScope] = useState<"todo" | "categoria" | "producto">(
    promotion?.product_id ? "producto" : promotion?.category_id ? "categoria" : "todo",
  );
  const [categoryId, setCategoryId] = useState(promotion?.category_id ?? "");
  const [productId, setProductId] = useState(promotion?.product_id ?? "");
  const [allyId, setAllyId] = useState(promotion?.ally_id ?? "");
  const [includeChildren, setIncludeChildren] = useState(promotion?.include_child_categories ?? true);
  const [segments, setSegments] = useState<string[]>(promotion?.eligible_segments ?? []);
  const [active, setActive] = useState(promotion?.active ?? true);

  const estado = estadoVigencia(active, validFrom, validTo);

  function alternarSegmento(valor: string) {
    setSegments((previo) =>
      previo.includes(valor) ? previo.filter((s) => s !== valor) : [...previo, valor],
    );
  }

  function aplicarPreset(from: string, to: string) {
    setValidFrom(from);
    setValidTo(to);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!label.trim()) {
      setStatus({ error: "Poné un nombre a la promoción." });
      return;
    }
    const rules: Record<string, unknown> = { label: label.trim() };
    if (type === "volumen") {
      const limpios = tiers
        .filter((t) => t.min.trim())
        .map((t) => ({
          min: Number(t.min),
          ...(t.max.trim() ? { max: Number(t.max) } : {}),
          ...(t.discount_pct.trim()
            ? { discount_pct: Number(t.discount_pct) }
            : { free_item_sku: t.free_item_sku.trim() }),
        }));
      if (limpios.length === 0) {
        setStatus({ error: "Agregá al menos un escalón con su beneficio." });
        return;
      }
      rules.tiers = limpios;
    } else {
      const pct = Number(discount);
      if (Number.isNaN(pct) || pct <= 0 || pct > 100) {
        setStatus({ error: "El descuento debe estar entre 1 y 100." });
        return;
      }
      rules.discount_pct = pct;
      if (type === "campaña") rules.once_per_customer = oncePerCustomer;
    }
    if (validFrom && validTo && new Date(validTo) <= new Date(validFrom)) {
      setStatus({ error: "La vigencia termina antes de empezar." });
      return;
    }

    setStatus({ loading: true });
    const res = await fetch("/api/pack/commerce/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        promotion_id: promotion?.id ?? null,
        type,
        rules,
        valid_from: validFrom || null,
        valid_to: validTo || null,
        category_id: scope === "categoria" ? categoryId || null : null,
        product_id: scope === "producto" ? productId || null : null,
        ...(allies ? { ally_id: allyId || null } : {}),
        include_child_categories: includeChildren,
        eligible_segments: segments.length > 0 ? segments : null,
        active,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo guardar la promoción." });
      return;
    }
    setStatus({});
    setOpen(false);
    router.refresh();
  }

  const ejemplo = (() => {
    if (type === "volumen") return "3-5 unid → 10% · 6+ unid → 15%";
    const pct = Number(discount);
    if (!pct || Number.isNaN(pct)) return "";
    const base = 100_000;
    return `${pct}% sobre $${base.toLocaleString("es-CO")} → $${(base * (1 - pct / 100)).toLocaleString("es-CO")}`;
  })();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {promotion ? (
          <Button aria-label="Editar" size="icon" title="Editar" variant="outline">
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
        ) : (
          <Button variant="accent">
            <Plus className="h-4 w-4" aria-hidden /> Nueva promoción
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        title={promotion ? "Editar promoción" : "Nueva promoción"}
        description="Nombre, beneficio, vigencia y a quién alcanza. El agente aplica el mayor beneficio."
        className="max-h-[85vh] max-w-2xl overflow-y-auto"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="pr-label">
              <Input
                id="pr-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ej.: 10% en bebidas para fieles"
                required
              />
            </Field>
            <Field label="Tipo" htmlFor="pr-type">
              <Select id="pr-type" value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {type === "volumen" ? (
            <fieldset className="flex flex-col gap-3">
              <legend className="pb-1 text-[11px] font-medium tracking-[0.06em] text-text-soft uppercase">
                Escalones por cantidad
              </legend>
              {tiers.map((tier, indice) => (
                <div key={indice} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-end gap-2">
                  <Field label="Desde" htmlFor={`tier-min-${indice}`}>
                    <Input
                      id={`tier-min-${indice}`}
                      type="number"
                      min={1}
                      value={tier.min}
                      onChange={(e) =>
                        setTiers((previo) =>
                          previo.map((t, i) => (i === indice ? { ...t, min: e.target.value } : t)),
                        )
                      }
                    />
                  </Field>
                  <Field label="Hasta" htmlFor={`tier-max-${indice}`}>
                    <Input
                      id={`tier-max-${indice}`}
                      type="number"
                      min={1}
                      value={tier.max}
                      onChange={(e) =>
                        setTiers((previo) =>
                          previo.map((t, i) => (i === indice ? { ...t, max: e.target.value } : t)),
                        )
                      }
                    />
                  </Field>
                  <Field label="Desc. %" htmlFor={`tier-pct-${indice}`}>
                    <Input
                      id={`tier-pct-${indice}`}
                      type="number"
                      min={0}
                      max={100}
                      value={tier.discount_pct}
                      onChange={(e) =>
                        setTiers((previo) =>
                          previo.map((t, i) =>
                            i === indice
                              ? { ...t, discount_pct: e.target.value, free_item_sku: "" }
                              : t,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="o regalo (SKU)" htmlFor={`tier-sku-${indice}`}>
                    <Input
                      id={`tier-sku-${indice}`}
                      value={tier.free_item_sku}
                      onChange={(e) =>
                        setTiers((previo) =>
                          previo.map((t, i) =>
                            i === indice
                              ? { ...t, free_item_sku: e.target.value, discount_pct: "" }
                              : t,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Button
                    type="button"
                    aria-label={`Quitar escalón ${indice + 1}`}
                    size="icon"
                    variant="ghost"
                    title="Quitar escalón"
                    onClick={() => setTiers((previo) => previo.filter((_, i) => i !== indice))}
                    disabled={tiers.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-status-danger-fg" aria-hidden />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() =>
                  setTiers((previo) => [
                    ...previo,
                    { min: "", max: "", discount_pct: "", free_item_sku: "" },
                  ])
                }
              >
                <Plus className="h-4 w-4" aria-hidden /> Agregar escalón
              </Button>
            </fieldset>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Descuento (%)" htmlFor="pr-discount">
                <div className="flex items-center gap-3">
                  <Input
                    id="pr-discount"
                    type="range"
                    min={1}
                    max={100}
                    value={Number(discount) || 1}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="h-10 flex-1"
                  />
                  <Input
                    aria-label="Descuento en porcentaje"
                    className="w-20"
                    max={100}
                    min={1}
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
              </Field>
              <div className="flex flex-col justify-end gap-1 text-sm">
                {type === "campaña" && (
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-body">Una vez por cliente</span>
                    <Switch checked={oncePerCustomer} onCheckedChange={setOncePerCustomer} />
                  </label>
                )}
                {ejemplo && <p className="text-xs text-text-soft">Vista previa: {ejemplo}</p>}
              </div>
            </div>
          )}

          <fieldset className="flex flex-col gap-3">
            <legend className="pb-1 text-[11px] font-medium tracking-[0.06em] text-text-soft uppercase">
              Vigencia
            </legend>
            <div className="flex flex-wrap gap-2">
              {presets().map((p) => (
                <Button
                  key={p.label}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => aplicarPreset(p.from, p.to)}
                >
                  {p.label}
                </Button>
              ))}
              <Badge variant={estado.tone === "success" ? "success" : estado.tone === "danger" ? "danger" : estado.tone === "warning" ? "warning" : "neutral"}>
                {estado.label}
              </Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Desde"
                htmlFor="pr-from"
                help="Vacío = sin límite de inicio."
              >
                <Input
                  id="pr-from"
                  type="datetime-local"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                />
              </Field>
              <Field label="Hasta" htmlFor="pr-to" help="Vacío = sin límite de fin.">
                <Input
                  id="pr-to"
                  type="datetime-local"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                />
              </Field>
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="pb-1 text-[11px] font-medium tracking-[0.06em] text-text-soft uppercase">
              Alcance
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Aplica a" htmlFor="pr-scope">
                <Select
                  id="pr-scope"
                  value={scope}
                  onChange={(e) => setScope(e.target.value as "todo" | "categoria" | "producto")}
                >
                  <option value="todo">Toda la tienda</option>
                  <option value="categoria">Una categoría</option>
                  <option value="producto">Un producto</option>
                </Select>
              </Field>
              {scope === "categoria" && (
                <Field label="Categoría" htmlFor="pr-category">
                  <Select
                    id="pr-category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Elige una categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              {scope === "producto" && (
                <Field label="Producto" htmlFor="pr-product">
                  <Select
                    id="pr-product"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                  >
                    <option value="">Elige un producto</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
            {allies && (
              <Field
                label="Aliado"
                htmlFor="pr-ally"
                help="Con aliado, aplica solo si todo el carrito es de ese aliado; un carrito mixto no la recibe."
              >
                <Select id="pr-ally" value={allyId} onChange={(e) => setAllyId(e.target.value)}>
                  <option value="">Cualquier aliado</option>
                  {allies.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {scope === "categoria" && (
              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="text-body">Incluir subcategorías</span>
                <Switch checked={includeChildren} onCheckedChange={setIncludeChildren} />
              </label>
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="pb-1 text-[11px] font-medium tracking-[0.06em] text-text-soft uppercase">
              Clientes alcanzados
            </legend>
            <p className="text-xs text-text-soft">Sin selección = todos los clientes.</p>
            <div className="flex flex-wrap gap-2">
              {SEGMENTOS.map((s) => {
                const activo = segments.includes(s.value);
                return (
                  <Button
                    key={s.value}
                    type="button"
                    size="sm"
                    variant={activo ? "accent" : "outline"}
                    aria-pressed={activo}
                    onClick={() => alternarSegmento(s.value)}
                  >
                    {s.label}
                  </Button>
                );
              })}
            </div>
          </fieldset>

          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-body">
              Promoción activa <span className="text-text-soft">(desactivá para guardar borrador)</span>
            </span>
            <Switch checked={active} onCheckedChange={setActive} />
          </label>

          <FormFeedback error={status.error} />

          <div className="mt-2 flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" aria-label="Cancelar" size="icon" title="Cancelar" variant="outline">
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </DialogClose>
            <Button type="submit" variant="accent" disabled={status.loading}>
              {status.loading ? "Guardando…" : "Guardar promoción"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Activa/desactiva una promoción. */
export function PromotionToggle({ promotionId, active }: { promotionId: string; active: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(active);
  const [loading, setLoading] = useState(false);

  async function toggle(next: boolean) {
    setValue(next);
    setLoading(true);
    await fetch(`/api/pack/commerce/promotions/${promotionId}/toggle`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Switch
        checked={value}
        onCheckedChange={(next) => void toggle(next)}
        disabled={loading}
        aria-label="Activar promoción"
      />
      <span className="text-xs text-body">{value ? "Activa" : "Inactiva"}</span>
    </div>
  );
}
