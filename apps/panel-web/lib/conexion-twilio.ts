import type { components } from "@/lib/api/schema";
import type { Me } from "@/lib/api/types";

/**
 * WhatsApp vía Twilio en el panel (ADR-0186, HU-CONN-11 y HU-CONN-13): reglas puras del alta guiada y de la
 * ficha. Sin JSX ni fetch.
 */

export type ConexionTwilio = components["schemas"]["ConexionTwilioOut"];
export type DescubrirTwilio = components["schemas"]["TwilioDescubrirOut"];
export type SenderTwilio = components["schemas"]["TwilioSenderOut"];
export type CostosTwilio = components["schemas"]["TwilioCostosOut"];

type Tono = "success" | "warning" | "danger" | "info" | "neutral";

/** Base del BFF de Twilio (`app/api/connections/twilio`). */
export const BFF_TWILIO = "/api/connections/twilio";

/**
 * Escribir (descubrir, conectar, refrescar, re-registrar, probar y rotar) es del propietario o del master con
 * Conexiones en escritura, como el backend (`require_owner_or_master`). El resto ve la ficha en solo lectura.
 */
export function puedeEscribirTwilio(me: Pick<Me, "role" | "tenant" | "permissions">): boolean {
  return me.permissions?.connections === "write" && (me.role === "master" || me.tenant?.role === "owner");
}

const SID_DE_CUENTA = /^AC[0-9a-f]{32}$/i;

/** Lo que se revisa antes de llamar a Twilio: el SID tiene forma `AC…` de 34 caracteres y hay token. */
export function erroresDeCredenciales(accountSid: string, authToken: string): { account_sid?: string; auth_token?: string } {
  const errores: { account_sid?: string; auth_token?: string } = {};
  const sid = accountSid.trim();
  if (!sid) errores.account_sid = "Pega el Account SID de tu cuenta de Twilio.";
  else if (!SID_DE_CUENTA.test(sid)) errores.account_sid = "El Account SID empieza por «AC» y tiene 34 caracteres.";
  if (!authToken.trim()) errores.auth_token = "Pega el Auth Token de la misma cuenta.";
  return errores;
}

/** Mensajes de los `code` estables de `twilio_connections.py`. Si no hay, se usa el texto de la API. */
const ERRORES: Record<string, string> = {
  twilio_credentials_invalid: "Twilio no aceptó el Account SID o el Auth Token. Cópialos otra vez desde la consola de Twilio.",
  twilio_account_suspended: "La cuenta de Twilio está suspendida o cerrada: actívala en Twilio y vuelve a intentar.",
  cuenta_en_otro_negocio: "Esa cuenta de Twilio ya está conectada en otro negocio de solvershub.",
  sender_ya_conectado: "Ese número ya está conectado en otro negocio de solvershub.",
  sender_not_found: "Twilio ya no tiene ese número en la cuenta. Vuelve al paso anterior y elige otro.",
  sender_not_online: "Ese número todavía no está en línea en Twilio: termina su registro en la consola de Twilio.",
  webhook_overwrite_not_confirmed: "El número ya manda sus mensajes a otra dirección. Confirma que quieres reemplazarla.",
  conexion_pausada: "La conexión está pausada: reanúdala para hacer esto.",
  fuera_de_ventana:
    "WhatsApp solo deja mandar texto si ese número le escribió al negocio en las últimas 24 h. Escribe primero desde ese teléfono y vuelve a probar.",
  numero_invalido: "Ese número no es válido. Escríbelo con el indicativo del país, por ejemplo +57 300 123 4567.",
  too_many_tests: "Espera unos segundos antes de mandar otra prueba.",
  daily_limit: "Ya mandaste las 10 pruebas de hoy. Vuelve a intentar mañana.",
  twilio_unavailable: "Twilio no respondió. Vuelve a intentar en unos minutos.",
};

export function mensajeErrorTwilio(code: string | undefined, fallback: string): string {
  return (code && ERRORES[code]) || fallback;
}

const ESTADOS: Record<string, { label: string; tono: Tono; detalle: string }> = {
  connected: { label: "Funciona", tono: "success", detalle: "El número recibe y manda mensajes por solvershub." },
  pending: { label: "Sin terminar", tono: "info", detalle: "El alta no terminó: vuelve a revisar o a registrar los webhooks." },
  degraded: {
    label: "Con avisos",
    tono: "warning",
    detalle: "El número no está en línea en Twilio o sus webhooks ya no apuntan a solvershub.",
  },
  revoked: {
    label: "No funciona",
    tono: "danger",
    detalle: "Twilio rechaza las credenciales o la cuenta no está activa: cámbialas en Credenciales.",
  },
  error: { label: "No funciona", tono: "danger", detalle: "Twilio respondió con un error en la última revisión." },
};

/** Estado de la conexión de Twilio en palabras, con su tono y qué hacer. */
export function estadoTwilio(status: string): { label: string; tono: Tono; detalle: string } {
  return ESTADOS[status] ?? { label: status || "Sin revisar", tono: "neutral", detalle: "" };
}

/** Por qué un número de la cuenta no se puede elegir en el paso 2 (`motivo` del discover). */
export function motivoDeSender(s: Pick<SenderTwilio, "motivo" | "status">): string {
  if (s.motivo === "no_online") return `No está en línea en Twilio (${s.status || "sin estado"}).`;
  if (s.motivo === "ya_conectado_aqui") return "Ya está conectado en este negocio.";
  return "";
}

/** Nombre del número en la lista del paso 2: «+57 300… · Nombre visible». */
export function etiquetaDeSender(s: Pick<SenderTwilio, "e164" | "display_name">): string {
  const nombre = s.display_name.trim();
  return nombre ? `${s.e164} · ${nombre}` : s.e164;
}

/** La dirección a la que el número ya mandaba sus mensajes, si la API la adjunta (`details.previous_webhook`). */
export function webhookPrevio(details: Record<string, unknown> | undefined): string | null {
  const previo = details?.previous_webhook;
  if (typeof previo === "string") return previo || null;
  if (previo && typeof previo === "object") {
    const url = Object.values(previo as Record<string, unknown>).find((v) => typeof v === "string" && v);
    return typeof url === "string" ? url : null;
  }
  return null;
}

/** Total de una moneda: Twilio informa el precio en negativo (lo que se debita); se muestra como costo. */
export function totalDeMoneda(m: Pick<CostosTwilio["por_moneda"][number], "moneda" | "total">): string {
  const valor = Math.abs(Number(m.total));
  if (!Number.isFinite(valor)) return `${m.total} ${m.moneda}`.trim();
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: m.moneda || "USD",
      maximumFractionDigits: 4,
    }).format(valor);
  } catch {
    // Una moneda que Intl no conoce sale con su código.
    return `${valor} ${m.moneda}`.trim();
  }
}

const BASE_BACKEND = "/admin/connections/twilio";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POST_DE_CONEXION = new Set(["refresh", "webhooks", "test-message"]);

/**
 * Rutas del BFF (`/api/connections/twilio/**`) → ruta del backend (`/admin/connections/twilio/**`). Lista cerrada:
 * solo se reenvía lo que usa el alta y la ficha (P-1), con su método y un id con forma de UUID. Los días de Costos
 * se acotan a 1–90 como el backend.
 */
export function rutaTwilioDeBackend(metodo: string, segmentos: readonly string[], dias?: string | null): string | null {
  const m = metodo.toUpperCase();
  if (segmentos.length === 0) return m === "POST" ? BASE_BACKEND : null;
  const [primero, segundo] = segmentos;
  if (segmentos.length === 1) {
    if (m === "POST" && primero === "discover") return `${BASE_BACKEND}/discover`;
    if (m === "GET" && UUID.test(primero)) return `${BASE_BACKEND}/${primero}`;
    return null;
  }
  if (segmentos.length !== 2 || !UUID.test(primero)) return null;
  if (m === "POST" && POST_DE_CONEXION.has(segundo)) return `${BASE_BACKEND}/${primero}/${segundo}`;
  if (m === "PUT" && segundo === "credentials") return `${BASE_BACKEND}/${primero}/credentials`;
  if (m === "GET" && segundo === "costs") {
    const n = Number(dias ?? 30);
    const acotado = Number.isInteger(n) ? Math.min(90, Math.max(1, n)) : 30;
    return `${BASE_BACKEND}/${primero}/costs?dias=${acotado}`;
  }
  return null;
}
