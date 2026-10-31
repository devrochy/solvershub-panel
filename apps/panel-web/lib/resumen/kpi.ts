import type { KpiDelta } from "@/components/ui/kpi-tile";
import type { KpiResumen } from "@/lib/api/types";
import { formatLatency, formatMoney, formatNumber, formatUsd } from "@/lib/format";

import { hrefDeDestino } from "./destinos";
import { versusDeDias } from "./periodos";

/** KPIs de «foto de hoy» que piden atención en cuanto hay alguno (como la tarjeta de antes). */
const ALERTA_SI_HAY = new Set(["escalaciones_pendientes"]);

const SIN_DATO = "—";

/** El valor listo para mostrar: «—» cuando el backend no tiene datos suficientes. */
export function valorDeKpi(k: Pick<KpiResumen, "valor" | "unidad">): string {
  if (k.valor === null || k.valor === undefined) return SIN_DATO;
  switch (k.unidad) {
    case "pct":
      return `${k.valor.toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`;
    case "usd":
      return formatUsd(k.valor, 2);
    case "money":
      return formatMoney(k.valor);
    case "ms":
      return formatLatency(k.valor);
    default:
      return formatNumber(k.valor);
  }
}

export function deltaDeKpi(k: KpiResumen, dias = 7): KpiDelta | undefined {
  if (k.delta_pct === null || k.delta_pct === undefined) return undefined;
  return { value: k.delta_pct, versus: k.versus ?? versusDeDias(dias) };
}

/** Props de `KpiTile` para un KPI del Resumen: valor, variación con su polaridad y enlace. */
export function propsDeKpi(k: KpiResumen, dias = 7) {
  return {
    label: k.label,
    value: valorDeKpi(k),
    delta: deltaDeKpi(k, dias),
    polarity: k.polaridad,
    hint: k.hint ?? undefined,
    href: hrefDeDestino(k.destino),
    tone: ALERTA_SI_HAY.has(k.id) && (k.valor ?? 0) > 0 ? ("warning" as const) : ("default" as const),
  };
}
