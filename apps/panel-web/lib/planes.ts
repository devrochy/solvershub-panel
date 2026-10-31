/**
 * Planes de suscripción (SPEC-43, HU-SUB-31): el catálogo vive en `pack-subscriptions` y se administra
 * en Suscripciones › Planes. Lógica pura: el fetch vive en la página y en el diálogo.
 *
 * Reglas que fija el servidor y que aquí solo se anticipan para no dejar al dueño con un 422:
 * - D-16: solo un plan de $0 tiene días de prueba.
 * - El código es único por negocio (409 `codigo_duplicado`).
 * - Editar reemplaza el plan completo, pero las suscripciones ya inscritas conservan su precio.
 */
import type { MinimoPagoEnLineaOut, PlanBody, PlanOut } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { periodicidadLabel } from "@/lib/suscripciones-admin";

export const PERIODICIDADES_DE_PLAN = ["mensual", "trimestral", "anual"] as const;
export type PeriodicidadDePlan = (typeof PERIODICIDADES_DE_PLAN)[number];

/** Cuántos períodos mensuales junta cada periodicidad: sirve para sugerir un plan más largo. */
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
 * el guardado. El mínimo viene del servidor: aquí no hay ninguna cifra. Sin aviso si es gratis ($0),
 * si no hay mínimo (sin pasarela) o si está apagado (0).
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
    if (total >= minimo) alternativas.push({ value, label: periodicidadLabel(value), precio: total });
  }
  return {
    mensaje:
      `Este plan cobra ${formatMoney(precio, moneda)} por período y el mínimo para pagar en línea es ` +
      `${formatMoney(minimo, moneda)}. Ese cobro no podrá tener link de pago: se cobrará por transferencia.`,
    alternativas,
    sinCuentas: info.cuentas_de_transferencia === 0,
  };
}

// ----------------------------------------------------------------------------- formulario
/** Lo que el dueño edita en el diálogo; los números viajan como texto hasta validar. */
export type PlanFormulario = {
  codigo: string;
  nombre: string;
  descripcion: string;
  precio: string;
  periodicidad: string;
  trial_dias: string;
  activo: boolean;
};

export const PLAN_VACIO: PlanFormulario = {
  codigo: "",
  nombre: "",
  descripcion: "",
  precio: "0",
  periodicidad: "mensual",
  trial_dias: "0",
  activo: true,
};

export function formularioDePlan(plan?: PlanOut | null): PlanFormulario {
  if (!plan) return PLAN_VACIO;
  return {
    codigo: plan.codigo,
    nombre: plan.nombre,
    descripcion: plan.descripcion ?? "",
    precio: String(plan.precio),
    periodicidad: plan.periodicidad,
    trial_dias: String(plan.trial_dias ?? 0),
    activo: plan.activo,
  };
}

/** D-16: la prueba solo existe en un plan de $0; con precio, el campo se apaga. */
export function permiteProbar(precio: string): boolean {
  const n = Number(precio);
  return precio.trim() !== "" && Number.isFinite(n) && n === 0;
}

export type CuerpoDePlan = { cuerpo: PlanBody } | { error: string };

/**
 * Cuerpo de `POST/PUT /planes`. `PUT` reemplaza el plan completo: lo que el formulario no edita
 * (moneda, orden, qué incluye y plan de la plataforma) se devuelve tal como está en `base`.
 */
export function cuerpoDePlan(
  f: PlanFormulario,
  base: Pick<PlanOut, "moneda" | "entitlements" | "plan_plataforma" | "orden"> | null,
  moneda = "COP",
): CuerpoDePlan {
  const codigo = f.codigo.trim();
  const nombre = f.nombre.trim();
  if (!codigo) return { error: "Escribe el código del plan." };
  if (!nombre) return { error: "Escribe el nombre del plan." };
  const precio = Number(f.precio);
  if (f.precio.trim() === "" || !Number.isFinite(precio) || precio < 0) {
    return { error: "El precio tiene que ser un número igual o mayor a 0." };
  }
  if (!PERIODICIDADES_DE_PLAN.includes(f.periodicidad as PeriodicidadDePlan)) {
    return { error: "Elige la periodicidad del plan." };
  }
  const prueba = f.trial_dias.trim() === "" ? 0 : Number(f.trial_dias);
  if (!Number.isInteger(prueba) || prueba < 0 || prueba > 365) {
    return { error: "Los días de prueba son un número entero entre 0 y 365." };
  }
  if (prueba > 0 && precio > 0) return { error: "Solo un plan de $0 puede tener días de prueba." };
  return {
    cuerpo: {
      codigo,
      nombre,
      descripcion: f.descripcion.trim(),
      precio,
      moneda: base?.moneda ?? moneda,
      periodicidad: f.periodicidad as PeriodicidadDePlan,
      trial_dias: prueba,
      entitlements: base?.entitlements ?? {},
      plan_plataforma: base?.plan_plataforma ?? null,
      activo: f.activo,
      orden: base?.orden ?? 0,
    },
  };
}

/** `PlanBody` de un plan existente con otro estado: para activar o desactivar sin abrir el diálogo. */
export function cuerpoConEstado(plan: PlanOut, activo: boolean): PlanBody {
  return {
    codigo: plan.codigo,
    nombre: plan.nombre,
    descripcion: plan.descripcion ?? "",
    precio: plan.precio,
    moneda: plan.moneda,
    periodicidad: plan.periodicidad,
    trial_dias: plan.trial_dias ?? 0,
    entitlements: plan.entitlements ?? {},
    plan_plataforma: plan.plan_plataforma ?? null,
    activo,
    orden: plan.orden ?? 0,
  };
}

// ----------------------------------------------------------------------------- textos
export function textoDePrueba(plan: Pick<PlanOut, "trial_dias">): string {
  const dias = plan.trial_dias ?? 0;
  if (dias <= 0) return "Sin prueba";
  return dias === 1 ? "1 día" : `${dias} días`;
}

export const PLAN_ESTADO = {
  activo: { label: "Activo", variant: "success" },
  inactivo: { label: "Inactivo", variant: "neutral" },
} as const;

export function estadoDelPlan(plan: Pick<PlanOut, "activo">): keyof typeof PLAN_ESTADO {
  return plan.activo ? "activo" : "inactivo";
}

export type AccionDePlan = "desactivar" | "activar" | "eliminar";

export const ACCION_DE_PLAN_EXITO: Record<AccionDePlan, string> = {
  desactivar: "Plan desactivado.",
  activar: "Plan activado.",
  eliminar: "Plan eliminado.",
};

/** Confirmación de activar, desactivar o eliminar: dice qué pasa con quienes ya están inscritos. */
export function confirmacionDeAccionDePlan(accion: AccionDePlan, plan: Pick<PlanOut, "nombre">) {
  switch (accion) {
    case "desactivar":
      return {
        title: `¿Desactivar «${plan.nombre}»?`,
        description:
          "Deja de ofrecerse para inscribir clientes nuevos. Quienes ya están inscritos siguen con su plan y " +
          "siguen pagando. Puedes activarlo de nuevo cuando quieras.",
        confirmLabel: "Desactivar plan",
        destructive: false,
      };
    case "activar":
      return {
        title: `¿Activar «${plan.nombre}»?`,
        description: "Vuelve a ofrecerse para inscribir clientes.",
        confirmLabel: "Activar plan",
        destructive: false,
      };
    case "eliminar":
      return {
        title: `¿Eliminar «${plan.nombre}»?`,
        description:
          "Deja de ofrecerse y desaparece de esta lista. Quienes ya están inscritos siguen cobrándose con las " +
          "condiciones con las que entraron.",
        confirmLabel: "Eliminar plan",
        destructive: true,
      };
  }
}
