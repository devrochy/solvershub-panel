import type { SubscriptionProviderSettings } from "@/lib/api/types";

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
