/**
 * Depurador del turno y «En curso» (HU-AOS-28, ADR-0169): lógica pura de la vista. Traduce los
 * códigos del kernel a lenguaje claro (nunca un enum crudo) y arma los resúmenes.
 */
import type { InProgressMissing, InProgressTask, TurnDetail, TurnStep, TurnTaskEvent } from "@/lib/api/types";
import { formatLatency } from "@/lib/format";

/** `pack_commerce.contratar_plan` → «contratar plan»; `crear_pedido` → «crear pedido». */
export function humanizar(id: string | null | undefined): string {
  if (!id) return "";
  const ultimo = id.includes(".") ? id.slice(id.lastIndexOf(".") + 1) : id;
  return ultimo.replace(/[_-]+/g, " ").trim();
}

export const TIPO_DE_PASO: Record<string, string> = {
  command: "Comando del agente",
  action: "Acción",
  engine: "Motor de procedimientos",
  escalation: "Escalación",
  verifier: "Verificador",
  guardrail: "Límite de respuesta",
  other: "Otro",
};

const DECISION: Record<string, string> = {
  routed: "Atendió el turno",
  blocked: "Bloqueó el turno",
  escalated: "Pasó a una persona",
  ignored: "No respondió (mensaje ignorado)",
};

const ESTADO: Record<string, string> = {
  replied: "Respondió",
  neutral: "Respondió con un mensaje neutro",
  escalated: "Pasó a una persona",
  silent: "No respondió",
  failed: "Falló",
};

const CARRIL: Record<string, string> = {
  stable: "versión publicada",
  canary: "versión en prueba",
  pinned: "versión fijada",
  legacy: "modo anterior, sin versiones",
};

const VEREDICTO: Record<string, string> = {
  pass: "Pasó",
  fail: "Rechazó la respuesta",
  unverifiable: "No se pudo verificar",
  error: "Error al verificar",
};

const ACCION_DEL_PASO: Record<string, string> = {
  execute: "se ejecutó",
  denied: "se denegó",
  confirmation_required: "pidió confirmación al cliente",
};

export function textoDeDecision(outcome: string): string {
  return DECISION[outcome] ?? humanizar(outcome);
}

export function textoDeEstado(status: string | null | undefined): string | null {
  return status ? (ESTADO[status] ?? humanizar(status)) : null;
}

export function textoDeVeredicto(verdict: string): string {
  return VEREDICTO[verdict] ?? humanizar(verdict);
}

/** El resumen de una línea del turno: quién lo atendió, con qué versión y cuánto tardó. */
export function resumenDelTurno(t: TurnDetail): string {
  const partes: string[] = [textoDeEstado(t.status) ?? textoDeDecision(t.decision.outcome)];
  const agente = t.decision.final_agent ?? t.decision.active_agent;
  if (agente) partes.push(agente.name);
  if (t.release_number != null) partes.push(`versión ${t.release_number}${t.lane ? ` (${CARRIL[t.lane] ?? t.lane})` : ""}`);
  else if (t.lane) partes.push(CARRIL[t.lane] ?? t.lane);
  if (t.latency_ms != null) partes.push(formatLatency(t.latency_ms));
  return partes.join(" · ");
}

/** Hubo traspaso a otro agente en el turno. */
export function huboTraspaso(t: TurnDetail): boolean {
  const a = t.decision.active_agent?.instance_id;
  const b = t.decision.final_agent?.instance_id;
  return a != null && b != null && a !== b;
}

/** El título de un paso: «Acción crear pedido: se ejecutó», «Comando del agente: actualizar tarea». */
export function tituloDePaso(p: TurnStep): string {
  const tipo = TIPO_DE_PASO[p.kind] ?? "Paso";
  const que = humanizar(p.name);
  if (p.kind === "action") return `${tipo} ${que}: ${ACCION_DEL_PASO[p.action] ?? humanizar(p.action)}`;
  if (p.kind === "command") return `${tipo}: ${humanizar(p.action)}`;
  return que && que !== humanizar(p.action) ? `${tipo}: ${humanizar(p.action)}` : tipo;
}

/** Resultado de un paso sin valores: bien, falló (con sus códigos) o nada que decir. */
export function resultadoDePaso(p: TurnStep): { texto: string; tono: "success" | "danger" | "neutral" } | null {
  if (p.ok === true) return { texto: "Bien", tono: "success" };
  if (p.ok === false) {
    return { texto: p.error_codes.length ? `Falló: ${p.error_codes.map(humanizar).join(", ")}` : "Falló", tono: "danger" };
  }
  return null;
}

const EVENTO: Record<string, string> = {
  started: "Empezó la tarea",
  slot_set: "Guardó un dato",
  slot_cleared: "Borró un dato",
  stage_entered: "Pasó de etapa",
  precondition_failed: "No se cumplió una condición",
  action_requested: "Pidió una acción",
  action_succeeded: "La acción salió bien",
  action_failed: "La acción falló",
  confirmation_requested: "Pidió confirmación al cliente",
  confirmed: "El cliente confirmó",
  suspended: "Pausó la tarea",
  resumed: "Retomó la tarea",
  owner_changed: "Cambió el agente a cargo",
  revalidated: "Se adaptó a una versión nueva",
  episode_expired: "Venció por inactividad",
  completed: "Terminó la tarea",
  cancelled: "Se canceló",
  failed: "Falló la tarea",
  escalated: "Pasó a una persona",
  taken: "Una persona la tomó",
  released: "La persona la devolvió",
};

/** Un evento de tarea en una línea: «Guardó un dato: correo», «Pasó de etapa: datos». */
export function textoDeEvento(e: TurnTaskEvent): string {
  const base = EVENTO[e.type] ?? humanizar(e.type);
  const d = e.data ?? {};
  const detalle = (d.slot ?? d.name ?? d.action ?? d.stage ?? d.to_stage ?? d.reason) as unknown;
  return typeof detalle === "string" && detalle ? `${base}: ${humanizar(detalle)}` : base;
}

// ---------------------------------------------------------------- «En curso»

/** Lo que falta en lenguaje claro: «Falta el correo», «Falta que el cliente confirme este paso». */
export function textoDeFalta(m: InProgressMissing): string {
  switch (m.kind) {
    case "confirmar_dato":
      return `Falta confirmar: ${m.label}`;
    case "confirmar_etapa":
      return "Falta que el cliente confirme este paso";
    case "accion":
      return `Falta ejecutar: ${m.label}`;
    case "dato_accion":
      return `Falta un dato que da el sistema: ${m.label}`;
    default:
      return `Falta: ${m.label}`;
  }
}

const ESTADO_TAREA: Record<string, string> = {
  active: "En curso",
  suspended: "En pausa",
  escalated: "Pasó a una persona",
};

export function estadoDeTarea(t: InProgressTask): string {
  return ESTADO_TAREA[t.status] ?? humanizar(t.status);
}

/** Por qué no hay lista de lo que falta, o el texto cuando no falta nada. */
export function textoSinFaltas(t: InProgressTask): string {
  if (t.missing_reason === "definicion_no_disponible") {
    return "No se pudo calcular qué falta: la versión de este trámite ya no está disponible.";
  }
  return t.pending_confirmation ? "Solo falta que el cliente confirme." : "No falta nada para seguir con esta etapa.";
}

/** Valor visible de un dato (los de pago ya llegan enmascarados). */
export function valorDeDato(valor: unknown): string {
  if (valor == null) return "—";
  if (typeof valor === "string") return valor;
  if (typeof valor === "number" || typeof valor === "boolean") return String(valor);
  return JSON.stringify(valor);
}

const ENVIO: Record<string, string> = {
  pending: "Pendiente",
  queued: "En cola",
  sent: "Enviado",
  delivered: "Entregado",
  read: "Leído",
  failed: "No enviado",
};

const CONSUMO: Record<string, string> = {
  turn: "Respuesta",
  agent_run: "Agente",
  classifier: "Clasificador",
  composer: "Redacción",
  embedding: "Búsqueda en el conocimiento",
  eval: "Evaluación",
};

const MODO_A2A: Record<string, string> = { handoff: "Traspaso", delegate: "Encargo", query: "Consulta" };

export function estadoDeEnvio(status: string | null | undefined): string {
  return status ? (ENVIO[status] ?? humanizar(status)) : "Sin estado";
}

export function tipoDeConsumo(kind: string): string {
  return CONSUMO[kind] ?? humanizar(kind);
}

export function modoEntreAgentes(mode: string | null | undefined): string {
  return mode ? (MODO_A2A[mode] ?? humanizar(mode)) : "Operación";
}
