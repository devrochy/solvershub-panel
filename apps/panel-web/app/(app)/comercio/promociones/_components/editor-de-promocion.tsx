"use client";

import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { InputNumero } from "@/components/ui/input-numero";
import { RadioGroup } from "@/components/ui/radio-group";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { diaLargo } from "@/lib/calendario/formulario";
import { formatMoney } from "@/lib/format";
import { promoEnPalabras, type NombresDeVentas } from "@/lib/ventas";
import { cn } from "@/lib/utils";

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

const TIPOS = [
  { value: "temporada", label: "Descuento", description: "Un porcentaje en lo que elijas, por unos días o siempre." },
  { value: "volumen", label: "Lleva más, paga menos", description: "Más descuento mientras más unidades lleve." },
  { value: "campaña", label: "Bienvenida o campaña", description: "Un descuento que cada cliente puede usar una vez." },
];

const SEGMENTOS = [
  { value: "nuevo", label: "Nuevos" },
  { value: "ocasional", label: "Ocasionales" },
  { value: "frecuente", label: "Frecuentes" },
  { value: "fiel", label: "Fieles" },
  { value: "inactivo", label: "Inactivos" },
];

type Escalon = { min: number; premio: "descuento" | "regalo"; pct: number; sku: string };

const dosCifras = (n: number) => String(n).padStart(2, "0");
const isoDia = (d: Date) => `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}`;
/** El día guardado, leído como el formulario lo escribe (`2026-11-20T00:00` es el 20). */
const diaDe = (valor: string | null | undefined) => (valor ? valor.slice(0, 10) : "");

function atajosDeFechas(): { label: string; desde: string; hasta: string }[] {
  const hoy = new Date();
  const finDeMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  const viernes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + ((5 - hoy.getDay() + 7) % 7));
  const domingo = new Date(viernes.getFullYear(), viernes.getMonth(), viernes.getDate() + 2);
  const en30 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 30);
  return [
    { label: "Este fin de semana", desde: isoDia(viernes), hasta: isoDia(domingo) },
    { label: "Lo que queda del mes", desde: isoDia(hoy), hasta: isoDia(finDeMes) },
    { label: "Los próximos 30 días", desde: isoDia(hoy), hasta: isoDia(en30) },
  ];
}

function escalonesIniciales(reglas: Record<string, unknown>): Escalon[] {
  const tiers = Array.isArray(reglas.tiers) ? (reglas.tiers as Record<string, unknown>[]) : [];
  if (tiers.length === 0) return [{ min: 3, premio: "descuento", pct: 10, sku: "" }];
  return tiers.map((t) => ({
    min: Number(t.min ?? 1),
    premio: t.discount_pct ? "descuento" : "regalo",
    pct: Number(t.discount_pct ?? 10),
    sku: String(t.free_item_sku ?? ""),
  }));
}

/**
 * Crear o editar una promoción en un cajón (VEN-12): primero qué tipo, luego un solo porcentaje,
 * cuándo, en qué productos y para quién, con la frase de cómo la ofrecerá el asistente. Las fechas
 * son días (de 00:00 a 23:59), con el mismo formato que antes en la API.
 */
export function EditorDePromocion({
  promocion,
  categorias,
  productos,
  aliados = null,
  nombres,
  alCerrar,
}: {
  promocion?: Promotion;
  categorias: Option[];
  productos: Option[];
  /** HU-CRM-03: `null` = aliados apagados; la promoción se guarda sin tocar su aliado. */
  aliados?: Option[] | null;
  nombres: NombresDeVentas;
  alCerrar: string;
}) {
  const router = useRouter();
  const reglas = (promocion?.rules ?? {}) as Record<string, unknown>;
  const [tipo, setTipo] = useState(promocion?.type ?? "temporada");
  const [nombre, setNombre] = useState(String(reglas.label ?? ""));
  const [pct, setPct] = useState(Number(reglas.discount_pct ?? 10));
  const [unaVez, setUnaVez] = useState(promocion ? Boolean(reglas.once_per_customer) : true);
  const [escalones, setEscalones] = useState<Escalon[]>(() => escalonesIniciales(reglas));
  const [conFechas, setConFechas] = useState(Boolean(promocion?.valid_from || promocion?.valid_to));
  const [desde, setDesde] = useState(diaDe(promocion?.valid_from));
  const [hasta, setHasta] = useState(diaDe(promocion?.valid_to));
  const [alcance, setAlcance] = useState<"todo" | "categoria" | "producto">(
    promocion?.product_id ? "producto" : promocion?.category_id ? "categoria" : "todo",
  );
  const [categoria, setCategoria] = useState(promocion?.category_id ?? "");
  const [producto, setProducto] = useState(promocion?.product_id ?? "");
  const [aliado, setAliado] = useState(promocion?.ally_id ?? "");
  const [subcategorias, setSubcategorias] = useState(promocion?.include_child_categories ?? true);
  const [segmentos, setSegmentos] = useState<string[]>(promocion?.eligible_segments ?? []);
  const [activa, setActiva] = useState(promocion?.active ?? true);
  const [estado, setEstado] = useState<{ guardando?: boolean; error?: string }>({});

  const cerrar = () => router.replace(alCerrar, { scroll: false });

  function armarReglas(): Record<string, unknown> {
    const r: Record<string, unknown> = { label: nombre.trim() };
    if (tipo === "volumen") {
      const ordenados = [...escalones].sort((a, b) => a.min - b.min);
      r.tiers = ordenados.map((e, i) => ({
        min: e.min,
        // El escalón llega hasta antes del siguiente: «3 a 5» y «6 o más».
        ...(ordenados[i + 1] ? { max: ordenados[i + 1].min - 1 } : {}),
        ...(e.premio === "descuento" ? { discount_pct: e.pct } : { free_item_sku: e.sku.trim() }),
      }));
    } else {
      r.discount_pct = pct;
      if (tipo === "campaña") r.once_per_customer = unaVez;
    }
    return r;
  }

  const borrador = {
    type: tipo,
    rules: armarReglas(),
    active: activa,
    valid_from: conFechas && desde ? `${desde}T00:00` : null,
    valid_to: conFechas && hasta ? `${hasta}T23:59` : null,
    category_id: alcance === "categoria" ? categoria || null : null,
    product_id: alcance === "producto" ? producto || null : null,
    ally_id: aliados ? aliado || null : (promocion?.ally_id ?? null),
    include_child_categories: subcategorias,
    eligible_segments: segmentos.length ? segmentos : null,
  };

  function error(): string | null {
    if (!nombre.trim()) return "Escribe un nombre para la promoción.";
    if (tipo !== "volumen" && (pct < 1 || pct > 100)) return "El descuento va de 1 a 100 %.";
    if (tipo === "volumen") {
      if (escalones.length === 0) return "Agrega al menos un escalón.";
      if (escalones.some((e) => e.premio === "regalo" && !e.sku.trim())) return "Escribe el código del producto de regalo.";
      if (new Set(escalones.map((e) => e.min)).size !== escalones.length) return "Dos escalones empiezan en la misma cantidad.";
    }
    if (conFechas && !desde && !hasta) return "Elige al menos una fecha, o marca «Siempre».";
    if (conFechas && desde && hasta && hasta < desde) return "La fecha de fin es antes de la de inicio.";
    if (alcance === "categoria" && !categoria) return "Elige la categoría.";
    if (alcance === "producto" && !producto) return "Elige el producto.";
    return null;
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problema = error();
    if (problema) {
      setEstado({ error: problema });
      return;
    }
    setEstado({ guardando: true });
    const res = await fetch("/api/pack/commerce/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        promotion_id: promocion?.id ?? null,
        ...borrador,
        ...(aliados ? {} : { ally_id: undefined }),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setEstado({ error: json.error ?? "No se pudo guardar la promoción." });
      return;
    }
    setEstado({});
    cerrar();
    router.refresh();
  }

  const frase = promoEnPalabras(borrador, nombres);
  const ejemplo = tipo !== "volumen" && pct > 0 && pct <= 100 ? `Un producto de ${formatMoney(100_000)} queda en ${formatMoney(100_000 * (1 - pct / 100))}.` : "";

  return (
    <Sheet open onOpenChange={(abierto) => !abierto && cerrar()}>
      <SheetContent
        title={promocion ? String(reglas.label ?? "Promoción") : "Nueva promoción"}
        description="El asistente la ofrece cuando aplica. Si varias aplican, usa la de mayor beneficio."
        footer={
          <>
            <Button type="button" variant="outline" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" form="editor-promocion" variant="accent" loading={estado.guardando}>
              {promocion ? "Guardar promoción" : "Crear promoción"}
            </Button>
          </>
        }
        className="sm:max-w-xl"
      >
        <form id="editor-promocion" onSubmit={guardar} className="flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-headline">¿Qué quieres ofrecer?</h3>
            <RadioGroup label="Tipo de promoción" name="pr-tipo" options={TIPOS} value={tipo} onValueChange={setTipo} />
          </section>

          <Field label="Nombre" htmlFor="pr-nombre" required help="Así la verás en el panel; el asistente puede mencionarla.">
            <Input id="pr-nombre" value={nombre} maxLength={120} onChange={(e) => setNombre(e.target.value)} placeholder="Día sin IVA" />
          </Field>

          {tipo === "volumen" ? (
            <section className="flex flex-col gap-3" aria-labelledby="pr-escalones">
              <h3 id="pr-escalones" className="text-sm font-medium text-headline">
                Según cuántas unidades lleve
              </h3>
              {escalones.map((e, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 text-sm text-body">
                  <span>Desde</span>
                  <InputNumero
                    aria-label={`Escalón ${i + 1}: desde cuántas unidades`}
                    className="w-20"
                    min={1}
                    value={e.min}
                    onValueChange={(min) => setEscalones((xs) => xs.map((x, j) => (j === i ? { ...x, min } : x)))}
                  />
                  <span>unidades:</span>
                  <Select
                    aria-label={`Escalón ${i + 1}: qué recibe`}
                    className="w-36"
                    value={e.premio}
                    onChange={(ev) => setEscalones((xs) => xs.map((x, j) => (j === i ? { ...x, premio: ev.target.value as Escalon["premio"] } : x)))}
                  >
                    <option value="descuento">un descuento</option>
                    <option value="regalo">un regalo</option>
                  </Select>
                  {e.premio === "descuento" ? (
                    <>
                      <InputNumero
                        aria-label={`Escalón ${i + 1}: porcentaje de descuento`}
                        className="w-20"
                        min={1}
                        max={100}
                        value={e.pct}
                        onValueChange={(v) => setEscalones((xs) => xs.map((x, j) => (j === i ? { ...x, pct: v } : x)))}
                      />
                      <span>%</span>
                    </>
                  ) : (
                    <Input
                      aria-label={`Escalón ${i + 1}: código del producto de regalo`}
                      className="w-40"
                      placeholder="Código (SKU)"
                      value={e.sku}
                      onChange={(ev) => setEscalones((xs) => xs.map((x, j) => (j === i ? { ...x, sku: ev.target.value } : x)))}
                    />
                  )}
                  {escalones.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar el escalón ${i + 1}`}
                      onClick={() => setEscalones((xs) => xs.filter((_, j) => j !== i))}
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => setEscalones((xs) => [...xs, { min: (xs.at(-1)?.min ?? 2) + 3, premio: "descuento", pct: (xs.at(-1)?.pct ?? 10) + 5, sku: "" }])}
              >
                <Plus className="h-4 w-4" aria-hidden /> Otro escalón
              </Button>
            </section>
          ) : (
            <div className="flex flex-col gap-3">
              <Field label="Descuento" htmlFor="pr-pct" help={ejemplo || undefined}>
                <div className="flex items-center gap-2">
                  <InputNumero id="pr-pct" className="w-24" min={1} max={100} value={pct} onValueChange={setPct} />
                  <span className="text-sm text-body">%</span>
                </div>
              </Field>
              {tipo === "campaña" && (
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-body">Solo una vez por cliente</span>
                  <Switch checked={unaVez} onCheckedChange={setUnaVez} aria-label="Solo una vez por cliente" />
                </label>
              )}
            </div>
          )}

          <section className="flex flex-col gap-3" aria-labelledby="pr-cuando">
            <h3 id="pr-cuando" className="text-sm font-medium text-headline">
              ¿Cuándo?
            </h3>
            <SegmentedControl
              label="Cuándo aplica"
              value={conFechas ? "fechas" : "siempre"}
              onChange={(v) => setConFechas(v === "fechas")}
              options={[
                { value: "siempre", label: "Siempre" },
                { value: "fechas", label: "Entre dos fechas" },
              ]}
              className="self-start"
            />
            {conFechas && (
              <>
                <div className="flex flex-wrap gap-2">
                  {atajosDeFechas().map((a) => (
                    <Button
                      key={a.label}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDesde(a.desde);
                        setHasta(a.hasta);
                      }}
                    >
                      {a.label}
                    </Button>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Desde" htmlFor="pr-desde" help={desde ? `Desde el ${diaLargo(desde)}` : "Sin fecha, empieza ya."}>
                    <Input id="pr-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
                  </Field>
                  <Field label="Hasta" htmlFor="pr-hasta" help={hasta ? `Hasta el ${diaLargo(hasta)}, a medianoche` : "Sin fecha, no termina."}>
                    <Input id="pr-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
                  </Field>
                </div>
              </>
            )}
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="pr-que">
            <h3 id="pr-que" className="text-sm font-medium text-headline">
              ¿En qué productos?
            </h3>
            <SegmentedControl
              label="En qué productos"
              value={alcance}
              onChange={(v) => setAlcance(v as typeof alcance)}
              options={[
                { value: "todo", label: "Toda la tienda" },
                { value: "categoria", label: "Una categoría" },
                { value: "producto", label: "Un producto" },
              ]}
              className="max-sm:w-full"
            />
            {alcance === "categoria" && (
              <>
                <Select aria-label="Categoría" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  <option value="">Elige una categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-body">También en sus subcategorías</span>
                  <Switch checked={subcategorias} onCheckedChange={setSubcategorias} aria-label="También en sus subcategorías" />
                </label>
              </>
            )}
            {alcance === "producto" && (
              <Select aria-label="Producto" value={producto} onChange={(e) => setProducto(e.target.value)}>
                <option value="">Elige un producto</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            )}
            {aliados && aliados.length > 0 && (
              <Field label="Solo productos de un aliado" htmlFor="pr-aliado" help="Aplica solo si todo el carrito es de ese aliado.">
                <Select id="pr-aliado" value={aliado} onChange={(e) => setAliado(e.target.value)}>
                  <option value="">De cualquiera</option>
                  {aliados.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="pr-quien">
            <h3 id="pr-quien" className="text-sm font-medium text-headline">
              ¿Para quién?
            </h3>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Clientes que la reciben">
              {SEGMENTOS.map((s) => {
                const elegido = segmentos.includes(s.value);
                return (
                  <Button
                    key={s.value}
                    type="button"
                    size="sm"
                    variant={elegido ? "accent" : "outline"}
                    aria-pressed={elegido}
                    onClick={() => setSegmentos((xs) => (elegido ? xs.filter((x) => x !== s.value) : [...xs, s.value]))}
                  >
                    {s.label}
                  </Button>
                );
              })}
            </div>
            <p className={cn("text-xs", segmentos.length ? "rounded-md bg-status-warning-bg px-3 py-2 text-sm text-status-warning-fg" : "text-text-soft")}>
              {segmentos.length
                ? "Solo para esas clasificaciones; también le llega a quien entre en ellas después."
                : "Sin elegir, es para todos los clientes."}
            </p>
          </section>

          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-body">Encendida</span>
            <Switch checked={activa} onCheckedChange={setActiva} aria-label="Promoción encendida" />
          </label>

          <p className="rounded-md bg-surface-raised px-3 py-2.5 text-sm text-body">
            El asistente ofrecerá: <span className="font-medium text-headline">{frase}</span>
            {!activa && " (cuando la enciendas)"}.
          </p>

          <FormFeedback error={estado.error} />
        </form>
      </SheetContent>
    </Sheet>
  );
}

/** Enciende o apaga una promoción desde su fila. */
export function InterruptorDePromocion({ id, nombre, activa }: { id: string; nombre: string; activa: boolean }) {
  const router = useRouter();
  const [valor, setValor] = useState(activa);
  const [cargando, setCargando] = useState(false);

  async function alternar(siguiente: boolean) {
    setValor(siguiente);
    setCargando(true);
    const res = await fetch(`/api/pack/commerce/promotions/${encodeURIComponent(id)}/toggle`, { method: "POST" }).catch(() => null);
    setCargando(false);
    if (!res?.ok) setValor(!siguiente);
    router.refresh();
  }

  return (
    <Switch
      checked={valor}
      onCheckedChange={(v) => void alternar(v)}
      disabled={cargando}
      aria-label={valor ? `Apagar ${nombre}` : `Encender ${nombre}`}
    />
  );
}
