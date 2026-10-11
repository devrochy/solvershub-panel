import type { Dominio, FormatoY, Valor } from "@/components/dataviz/escalas";

/**
 * Una serie declarada. La `key` es estable (el id de la entidad, no su posición): de ella
 * sale el color, así que filtrar series no repinta a las que quedan.
 */
export type ChartSeries = {
  key: string;
  label: string;
  /**
   * No existe a propósito: un gráfico tiene **un solo eje Y**. Dos medidas de escala distinta
   * van en dos gráficos, o indexadas a una base común (= 100) en el mismo eje.
   */
  axis?: never;
};

/** Una categoría del eje X (fecha ISO o etiqueta) con el valor de cada serie por `key`. */
export type ChartDatum = { x: string; values: Readonly<Record<string, Valor>> };

/**
 * Props comunes de `LineChart` y `BarChart`. El eje Y es uno solo: `yFormat` y `yDomain`
 * son escalares, y no hay variante para un segundo eje (`y2*`, `yAxisRight`).
 */
export type ChartProps = {
  /** Nombre del gráfico: lo anuncian los lectores de pantalla y titula la tabla. */
  title: string;
  /** Todas las series posibles, en el orden que fija su color (máx. 4; el resto va a «Otros»). */
  series: readonly ChartSeries[];
  data: readonly ChartDatum[];
  /** Keys a dibujar (filtro externo). Sin él se dibujan todas. No cambia los colores. */
  visibleKeys?: readonly string[];
  /** Texto de cada categoría del eje X (ticks, tooltip y tabla). Por defecto, `fechaCorta`. */
  xFormat?: (x: string) => string;
  /** Encabezado de la primera columna de la tabla. */
  xHeader?: string;
  /** Formato del único eje Y: `number`, `currency` (COP), `percent` (en puntos) o una función. */
  yFormat?: FormatoY;
  /** Dominio fijo del eje Y (por defecto se calcula con cero y ticks limpios). */
  yDomain?: Dominio;
  /** Alto del área del gráfico en píxeles, ejes incluidos. */
  height?: number;
  /** Texto cuando no hay datos. */
  emptyMessage?: string;
  className?: string;
  /** No existe: un solo eje Y (anti-patrón de doble eje). */
  yAxisRight?: never;
  /** No existe: un solo eje Y. */
  y2Format?: never;
  /** No existe: un solo eje Y. */
  y2Domain?: never;
};
