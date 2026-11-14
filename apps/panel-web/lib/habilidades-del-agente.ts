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

/** Un paso de la configuración de una habilidad, para que el dueño vea qué le falta. */
export type PasoDeHabilidad = {
  id: "activa" | "cuenta" | "responde" | "documentos";
  texto: string;
  hecho: boolean;
  /** El paso está hecho en el borrador pero los clientes todavía no lo ven. */
  sinPublicar?: boolean;
};

export type ContextoDeHabilidad = {
  cuentas: PaymentAccount[];
  /** El borrador declara la búsqueda en documentos. */
  usaEnBorrador: boolean;
  /** La versión que ven los clientes ya busca en documentos. */
  usaPublicado: boolean;
  documentos: number;
};

export function pasosDeHabilidad(h: AgentSkill, ctx: ContextoDeHabilidad): PasoDeHabilidad[] {
  const pasos: PasoDeHabilidad[] = [{ id: "activa", texto: "Habilidad activa", hecho: h.installed }];
  if (h.pack_id === PAGOS) {
    const cuenta = cuentaElegida(h, ctx.cuentas);
    pasos.push({ id: "cuenta", texto: cuenta ? `Cobra con ${etiquetaDeCuenta(cuenta)}` : "Elige la cuenta Wompi", hecho: Boolean(cuenta) });
  } else if (h.pack_id === CONOCIMIENTO) {
    pasos.push({
      id: "responde",
      texto: ctx.usaEnBorrador ? "Responde con los documentos" : "Responder con los documentos",
      hecho: ctx.usaEnBorrador,
      sinPublicar: ctx.usaEnBorrador && !ctx.usaPublicado,
    });
    pasos.push({
      id: "documentos",
      texto: ctx.documentos > 0 ? documentosCargados(ctx.documentos) : "Sube al menos un documento",
      hecho: ctx.documentos > 0,
    });
  }
  return pasos;
}

function documentosCargados(n: number): string {
  return n === 1 ? "1 documento cargado" : `${n} documentos cargados`;
}

/** Lo que se lee con la tarjeta cerrada: vacío si la habilidad no está agregada. */
export function resumenDeHabilidad(h: AgentSkill, pasos: PasoDeHabilidad[]): string {
  if (!h.installed) return "";
  const pendientes = pasos.filter((p) => !p.hecho || p.sinPublicar);
  if (pendientes.length === 0) {
    return pasos
      .filter((p) => p.id !== "activa")
      .map((p) => p.texto)
      .join(" · ");
  }
  return pendientes.length === 1 ? "Falta 1 paso" : `Faltan ${pendientes.length} pasos`;
}

/** Al cargar, la tarjeta se abre si la habilidad está agregada y le falta algo. */
export function abiertaAlCargar(h: AgentSkill, pasos: PasoDeHabilidad[]): boolean {
  return h.installed && pasos.some((p) => !p.hecho || p.sinPublicar);
}
