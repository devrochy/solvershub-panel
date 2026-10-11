import { scaleBand, scaleLinear, type ScaleBand, type ScaleLinear } from "d3-scale";
import { area, line } from "d3-shape";

/**
 * Geometría y formato de los gráficos (HU-DS-06, D-SPEC-29-2). Funciones puras sobre
 * `d3-scale` y `d3-shape`, sin React ni DOM: la app (`src/shared/dataviz`) replica este
 * archivo con los mismos casos de prueba, así los dos repos dibujan lo mismo.
 *
 * Convenciones: los valores que faltan llegan como `null`/`undefined` (la línea se corta,
 * no se inventa un cero); los porcentajes van en puntos (12 = 12 %), como `KpiDelta`.
 */

export type Valor = number | null | undefined;
export type Dominio = readonly [number, number];
export type Rango = readonly [number, number];

function esFinito(v: Valor): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** Redondeo a 2 decimales para que los paths sean estables (y comparables en los tests). */
function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ─── Dominios y ticks ──────────────────────────────────────────────────────────

/**
 * Dominio del eje Y con ticks limpios. Por defecto incluye el cero: barras y áreas parten de
 * la base, y una línea sin cero exagera las variaciones. Sin valores devuelve `[0, 1]`.
 */
export function dominioY(
  valores: readonly Valor[],
  { incluirCero = true, ticks = 4 }: { incluirCero?: boolean; ticks?: number } = {},
): [number, number] {
  const finitos = valores.filter(esFinito);
  if (finitos.length === 0) return [0, 1];
  let min = Math.min(...finitos);
  let max = Math.max(...finitos);
  if (incluirCero) {
    min = Math.min(0, min);
    max = Math.max(0, max);
  }
  if (min === max) {
    if (max === 0) return [0, 1];
    const margen = Math.abs(max) * 0.1;
    min -= margen;
    max += margen;
  }
  const [a, b] = scaleLinear().domain([min, max]).nice(ticks).domain();
  return [a, b];
}

/** Extensión exacta (sin redondear): para la sparkline, que muestra forma y no magnitud. */
export function extension(valores: readonly Valor[]): [number, number] {
  const finitos = valores.filter(esFinito);
  if (finitos.length === 0) return [0, 1];
  return [Math.min(...finitos), Math.max(...finitos)];
}

/** Ticks redondos del eje Y (0 / 500 / 1.000…), unos `cuantos` (d3 elige el paso limpio). */
export function ticksY(dominio: Dominio, cuantos = 4): number[] {
  return scaleLinear().domain(dominio).ticks(cuantos);
}

/** Escala del eje Y: `rango` va de abajo hacia arriba en píxeles (`[alto, 0]`). */
export function escalaY(dominio: Dominio, rango: Rango): ScaleLinear<number, number> {
  return scaleLinear().domain(dominio).range(rango);
}

/** Escala X por posición (0…n−1) para líneas. Con un solo punto lo centra. */
export function escalaX(n: number, rango: Rango): ScaleLinear<number, number> {
  return scaleLinear()
    .domain([0, Math.max(n - 1, 0)])
    .range(rango);
}

/**
 * Bandas de las barras, una por categoría (el dominio son índices: dos categorías con la
 * misma etiqueta no se pisan). `relleno` es el aire entre grupos.
 */
export function escalaBandas(n: number, rango: Rango, relleno = 0.3): ScaleBand<string> {
  return scaleBand<string>()
    .domain(Array.from({ length: n }, (_, i) => String(i)))
    .range(rango)
    .paddingInner(relleno)
    .paddingOuter(relleno / 2);
}

/** Índice del punto más cercano a una coordenada X (el crosshair «encuentra la X»). −1 sin datos. */
export function indiceCercano(px: number, n: number, x: ScaleLinear<number, number>): number {
  if (n <= 0) return -1;
  const i = Math.round(x.invert(px));
  return Math.min(n - 1, Math.max(0, Number.isFinite(i) ? i : 0));
}

/**
 * Qué categorías del eje X llevan etiqueta: como mucho `maximo`, repartidas con paso
 * fijo y siempre la primera y la última.
 */
export function indicesDeEtiquetas(n: number, maximo = 6): number[] {
  if (n <= 0) return [];
  if (n <= maximo) return Array.from({ length: n }, (_, i) => i);
  const paso = Math.ceil((n - 1) / (maximo - 1));
  const indices: number[] = [];
  for (let i = 0; i < n; i += paso) indices.push(i);
  const ultimo = indices[indices.length - 1];
  if (ultimo !== n - 1) {
    if (n - 1 - ultimo < paso / 2 || indices.length >= maximo) indices[indices.length - 1] = n - 1;
    else indices.push(n - 1);
  }
  return indices;
}

// ─── Paths ─────────────────────────────────────────────────────────────────────

/** Path de una línea (tramos rectos: no inventa picos entre puntos). Corta donde falta el valor. */
export function pathLinea(
  valores: readonly Valor[],
  x: (i: number) => number,
  y: (v: number) => number,
): string {
  const generador = line<Valor>()
    .defined(esFinito)
    .x((_, i) => x(i))
    .y((v) => y(v as number))
    .digits(2);
  return generador(valores as Valor[]) ?? "";
}

/** Path del área bajo la línea, hasta `base` (la Y en píxeles del cero o del piso). */
export function pathArea(
  valores: readonly Valor[],
  x: (i: number) => number,
  y: (v: number) => number,
  base: number,
): string {
  const generador = area<Valor>()
    .defined(esFinito)
    .x((_, i) => x(i))
    .y0(base)
    .y1((v) => y(v as number))
    .digits(2);
  return generador(valores as Valor[]) ?? "";
}

/**
 * Path de una barra vertical: extremo de datos redondeado (4 px) y esquina recta en la
 * base. `base` es la Y del cero y `tope` la del valor; si el valor es negativo la barra
 * crece hacia abajo y redondea abajo. Sin alto no hay barra (`""`).
 */
export function pathBarra({
  x,
  ancho,
  base,
  tope,
  radio = 4,
}: {
  x: number;
  ancho: number;
  base: number;
  tope: number;
  radio?: number;
}): string {
  const alto = Math.abs(base - tope);
  if (alto === 0 || ancho <= 0) return "";
  const r = r2(Math.min(radio, ancho / 2, alto));
  const [x0, x1, b, t] = [r2(x), r2(x + ancho), r2(base), r2(tope)];
  if (tope < base) {
    // Crece hacia arriba: redondea arriba.
    return `M${x0},${b}V${r2(t + r)}A${r},${r} 0 0 1 ${r2(x0 + r)},${t}H${r2(x1 - r)}A${r},${r} 0 0 1 ${x1},${r2(t + r)}V${b}Z`;
  }
  return `M${x0},${b}V${r2(t - r)}A${r},${r} 0 0 0 ${r2(x0 + r)},${t}H${r2(x1 - r)}A${r},${r} 0 0 0 ${x1},${r2(t - r)}V${b}Z`;
}

// ─── Color por entidad ─────────────────────────────────────────────────────────

export const CLAVE_OTROS = "__otros";
export const MAX_SERIES = 4;

export type SerieBase = { key: string; label: string };
export type FilaBase = { x: string; values: Readonly<Record<string, Valor>> };

/**
 * Ranura de color de una serie: la posición de su `key` en la lista **declarada** (no en
 * la de las visibles), así filtrar no repinta a las demás. Una sola serie declarada usa el
 * color de serie única; «Otros» usa el neutro. −1 si la key no está declarada.
 */
export function ranuraDeColor(key: string, declaradas: readonly SerieBase[]): number | "unica" | "otros" {
  if (key === CLAVE_OTROS) return "otros";
  if (declaradas.length === 1 && declaradas[0].key === key) return "unica";
  const i = declaradas.findIndex((s) => s.key === key);
  return i >= 0 && i < MAX_SERIES ? i : -1;
}

/**
 * Con más de 4 series, la quinta en adelante se suma en «Otros» (la paleta tiene 4
 * colores de orden fijo y nunca se cicla). Pensado para conteos y montos, que se suman.
 */
export function agruparEnOtros<S extends SerieBase, F extends FilaBase>(
  series: readonly S[],
  datos: readonly F[],
  maximo = MAX_SERIES,
): { series: SerieBase[]; datos: FilaBase[] } {
  if (series.length <= maximo) return { series: [...series], datos: [...datos] };
  const quedan = series.slice(0, maximo);
  const resto = series.slice(maximo).map((s) => s.key);
  return {
    series: [...quedan, { key: CLAVE_OTROS, label: "Otros" }],
    datos: datos.map((fila) => {
      const sumandos = resto.map((k) => fila.values[k]).filter(esFinito);
      const values: Record<string, Valor> = {};
      for (const s of quedan) values[s.key] = fila.values[s.key];
      values[CLAVE_OTROS] = sumandos.length ? sumandos.reduce((a, b) => a + b, 0) : null;
      return { x: fila.x, values };
    }),
  };
}

// ─── Formato (es-CO) ───────────────────────────────────────────────────────────

const numero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const numeroCorto = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/**
 * Cifra corta para ticks: 950 · 1,5 mil · 250 mil · 1,2 M · 3 mil M. (El `compact` de Intl
 * en es-CO mezcla «K» y «k» y escribe «1000 M», por eso va a mano.)
 */
export function formatoCompacto(v: number): string {
  const a = Math.abs(v);
  if (a < 1_000) return numeroCorto.format(v);
  if (a < 1_000_000) return `${numeroCorto.format(v / 1_000)} mil`;
  if (a < 1_000_000_000) return `${numeroCorto.format(v / 1_000_000)} M`;
  return `${numeroCorto.format(v / 1_000_000_000)} mil M`;
}

/** Formatos del único eje Y: un nombre conocido o una función propia (que se usa tal cual). */
export type FormatoY = "number" | "currency" | "percent" | ((v: number) => string);

/**
 * Formateador del eje Y. `compacto` es para los ticks; sin él, para tooltip y tabla.
 * `currency` es en pesos (COP, sin decimales).
 */
export function formateadorY(formato: FormatoY = "number", { compacto = false } = {}): (v: number) => string {
  if (typeof formato === "function") return formato;
  if (formato === "percent") return (v) => `${numeroCorto.format(v)} %`;
  if (formato === "currency") {
    return compacto ? (v) => `$ ${formatoCompacto(v)}` : (v) => `$ ${numero.format(Math.round(v))}`;
  }
  return compacto ? formatoCompacto : (v) => numero.format(v);
}

/** «2026-10-05» → «5 oct» (fecha local, sin corrimiento por zona horaria). Otro texto pasa igual. */
export function fechaCorta(x: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(x);
  if (!m) return x;
  const mes = MESES[Number(m[2]) - 1];
  return mes ? `${Number(m[3])} ${mes}` : x;
}

/**
 * Resumen en texto de una serie, para el `aria-label` de una sparkline que va sola:
 * «de 120 a 180, mínimo 100 y máximo 190». Sin datos: «sin datos».
 */
export function resumenSerie(valores: readonly Valor[], formato: (v: number) => string = formateadorY()): string {
  const finitos = valores.filter(esFinito);
  if (finitos.length === 0) return "sin datos";
  const [min, max] = extension(finitos);
  return `de ${formato(finitos[0])} a ${formato(finitos[finitos.length - 1])}, mínimo ${formato(min)} y máximo ${formato(max)}`;
}
