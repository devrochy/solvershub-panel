import type { MinimoPagoEnLineaOut, SubscriptionProviderSettings } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";

/** Recurrencia del plan en el formulario de producto (HU-SUB-09): vacío = venta única. */
export const COBROS = [
  { value: "", label: "Venta única" },
  { value: "mensual", label: "Plan mensual" },
  { value: "trimestral", label: "Plan trimestral" },
  { value: "anual", label: "Plan anual" },
] as const;

/** Cuerpo que espera la API: `billing_period` "" = no recurrente; prueba vacía = sin cambio. */
export function cuerpoDelPlan(data: FormData): { billing_period: string; trial_days: number | null } {
  const prueba = String(data.get("trial_days") ?? "").trim();
  return {
    billing_period: String(data.get("billing_period") ?? ""),
    trial_days: prueba === "" ? null : Number(prueba),
  };
}

/** Texto del estado del proveedor de suscripciones del negocio. */
export function textoEstado(s: SubscriptionProviderSettings): string {
  if (s.estado === "ok") {
    const label = s.habilitados.find((h) => h.id === s.efectivo)?.label ?? s.efectivo ?? "";
    return `Los planes se cobran con ${label}.`;
  }
  return s.mensaje;
}

/** Ayuda del selector «Cobro» del producto (HU-SUB-21): qué significa marcarlo como plan. */
export const AYUDA_COBRO =
  "Un plan es un servicio con suscripción: al comprarlo se crea la suscripción del cliente y se le cobra " +
  "solo cada periodo. Necesita la habilidad Suscripciones (cobro en línea) o Cobranza (cobro en campo).";

/** Etiqueta de plan de un producto según la recurrencia de sus variantes; null = venta única. */
export function planDelProducto(variantes: { billing_period?: string | null }[]): string | null {
  const etiquetas: string[] = [];
  for (const v of variantes) {
    if (!v.billing_period) continue;
    const etiqueta = COBROS.find((c) => c.value === v.billing_period)?.label ?? `Plan ${v.billing_period}`;
    if (!etiquetas.includes(etiqueta)) etiquetas.push(etiqueta);
  }
  return etiquetas.length ? etiquetas.join(" · ") : null;
}

export const TIPOS_DE_PRODUCTO = [
  { value: "", label: "Todos" },
  { value: "planes", label: "Planes (suscripción)" },
  { value: "unica", label: "Venta única" },
] as const;

/** Productos de un tipo: `planes` = con alguna variante recurrente, `unica` = sin ninguna. */
export function filtrarPorTipo<T extends { variants: { billing_period?: string | null }[] }>(
  productos: T[],
  tipo: string | undefined,
): T[] {
  if (tipo === "planes") return productos.filter((p) => planDelProducto(p.variants) !== null);
  if (tipo === "unica") return productos.filter((p) => planDelProducto(p.variants) === null);
  return productos;
}

/** Cuántos períodos mensuales junta cada recurrencia: sirve para sugerir un plan más largo. */
const MESES_DEL_PLAN: Record<string, number> = { mensual: 1, trimestral: 3, anual: 12 };

export interface AlternativaDePlan {
  value: "trimestral" | "anual";
  label: string;
  /** Precio por período del plan más largo, con la cuenta hecha (precio × meses ÷ meses del actual). */
  precio: number;
}

export interface AvisoDeMinimo {
  mensaje: string;
  alternativas: AlternativaDePlan[];
  /** El negocio no tiene cuentas de transferencia: el cobro sin link no tendría cómo pagarse. */
  sinCuentas: boolean;
}

/**
 * Aviso del plan cuyo precio por período queda bajo el mínimo de pago en línea (HU-SUB-25). No bloquea
 * el guardado. El mínimo viene del servidor: aquí no hay ninguna cifra. Sin aviso si no es plan, si es
 * gratis ($0), si no hay mínimo (sin pasarela) o si está apagado (0).
 */
export function avisoDeMinimo(
  { precio, periodo }: { precio: number; periodo: string },
  info: Pick<MinimoPagoEnLineaOut, "minimo" | "cuentas_de_transferencia"> | null,
  moneda = "COP",
): AvisoDeMinimo | null {
  const meses = MESES_DEL_PLAN[periodo];
  const minimo = info?.minimo;
  if (!meses || !info || minimo == null || minimo <= 0) return null;
  if (!Number.isFinite(precio) || precio <= 0 || precio >= minimo) return null;
  const alternativas: AlternativaDePlan[] = [];
  for (const [value, mesesDelPlan] of [["trimestral", 3], ["anual", 12]] as const) {
    if (mesesDelPlan <= meses) continue;
    const total = Math.round(precio * (mesesDelPlan / meses));
    if (total >= minimo) alternativas.push({ value, label: COBROS.find((c) => c.value === value)?.label ?? value, precio: total });
  }
  return {
    mensaje:
      `Este plan cobra ${formatMoney(precio, moneda)} por período y el mínimo para pagar en línea es ` +
      `${formatMoney(minimo, moneda)}. Ese cobro no podrá tener link de pago: se cobrará por transferencia.`,
    alternativas,
    sinCuentas: info.cuentas_de_transferencia === 0,
  };
}
