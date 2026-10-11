/**
 * Primitivas de visualización de datos del panel (HU-DS-06, D-SPEC-29-2): SVG propio sobre
 * d3-scale y d3-shape, colores `data-*` y un solo eje Y. Reglas en DESIGN.md · Gráficos.
 */
export { Sparkline } from "@/components/dataviz/sparkline";
export { LineChart, type LineChartProps } from "@/components/dataviz/line-chart";
export { BarChart, type BarChartProps } from "@/components/dataviz/bar-chart";
export { ProgressRing, tonoDeProgreso } from "@/components/dataviz/progress-ring";
export { clasesDeSerie, type ClasesDeSerie } from "@/components/dataviz/colores";
export type { ChartDatum, ChartProps, ChartSeries } from "@/components/dataviz/tipos";
export * from "@/components/dataviz/escalas";
