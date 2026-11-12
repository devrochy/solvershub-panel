import type { AgentSkill, PaymentAccount } from "@/lib/api/types";

/**
 * Habilidades que se agregan a uno o varios agentes (ADR-0190, HU-AOS-66). Nombres y explicación en lenguaje del dueño
 * (manual de marca §9.3: «habilidad», nunca «pack» ni «plugin»). Captar leads no es un pack: va en «Acciones».
 */
export const PAGOS = "pack_payments";
export const CONOCIMIENTO = "pack_knowledge";

const TEXTOS: Record<string, { nombre: string; descripcion: string }> = {
  [PAGOS]: {
    nombre: "Pagos en línea",
    descripcion: "El agente envía links de pago y confirma los pagos con la cuenta Wompi que elijas.",
  },
  [CONOCIMIENTO]: {
    nombre: "Conocimiento",
    descripcion: "El agente responde con los documentos que le cargues.",
  },
};

export function textoDeHabilidad(packId: string): { nombre: string; descripcion: string } {
  return TEXTOS[packId] ?? { nombre: "Habilidad", descripcion: "" };
}

export type EstadoDeHabilidad = "sin_agregar" | "lista" | "falta_configurar";

export function estadoDeHabilidad(h: AgentSkill): EstadoDeHabilidad {
  if (!h.installed) return "sin_agregar";
  return h.status === "active" ? "lista" : "falta_configurar";
}

/** La cuenta Wompi elegida por el agente, si sigue existiendo. */
export function cuentaElegida(h: AgentSkill | undefined, cuentas: PaymentAccount[]): PaymentAccount | undefined {
  const id = h?.config?.["cuenta_id"];
  return typeof id === "string" ? cuentas.find((c) => c.id === id) : undefined;
}

/** Texto corto de una cuenta para el selector: nombre y ambiente. */
export function etiquetaDeCuenta(c: PaymentAccount): string {
  return `${c.name} · ${c.sandbox ? "pruebas" : "producción"}`;
}

/** Administrar cuentas Wompi: escritura en la sección `plugins` (la de las habilidades) o master. */
export function puedeAdministrarCuentas(me: {
  role?: string | null;
  permissions?: Record<string, string | null | undefined> | null;
}): boolean {
  return me.role === "master" || me.permissions?.plugins === "write";
}
