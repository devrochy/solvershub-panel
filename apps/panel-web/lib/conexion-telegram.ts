import type { components } from "@/lib/api/schema";
import type { Me } from "@/lib/api/types";

/**
 * Telegram en el panel (ADR-0199, D-74, HU-CONN-27): reglas puras del alta con el token de @BotFather y de la ficha
 * del bot. Sin JSX ni fetch.
 */

export type ConexionTelegram = components["schemas"]["ConexionTelegramOut"];
export type PruebaTelegram = components["schemas"]["TelegramPruebaOut"];

type Tono = "success" | "warning" | "danger" | "info" | "neutral";

/** Base del BFF de Telegram (`app/api/connections/telegram`). */
export const BFF_TELEGRAM = "/api/connections/telegram";

/**
 * Conectar, revisar, reparar, probar, cambiar el token y desconectar son del propietario o del master con Conexiones
 * en escritura, como el backend (`require_owner_or_master`). El resto ve la ficha en solo lectura.
 */
export function puedeEscribirTelegram(me: Pick<Me, "role" | "tenant" | "permissions">): boolean {
  return me.permissions?.connections === "write" && (me.role === "master" || me.tenant?.role === "owner");
}

// `<id del bot>:<secreto>`: lo que entrega @BotFather. Se revisa la forma antes de llamar a Telegram.
const TOKEN = /^\d{1,20}:[A-Za-z0-9_-]{20,128}$/;

/** Lo que se revisa antes de llamar al backend: hay token y tiene la forma `123456789:AAH…`. */
export function errorDeToken(token: string): string | undefined {
  const limpio = token.trim();
  if (!limpio) return "Pega el token que te dio @BotFather.";
  if (!TOKEN.test(limpio)) return "El token se ve como 123456789:AAH… (un número, dos puntos y letras). Cópialo completo.";
  return undefined;
}

/** Mensajes de los `code` estables de `telegram_connections.py`. Si no hay, se usa el texto de la API. */
const ERRORES: Record<string, string> = {
  telegram_token_invalido: "Telegram no reconoce ese token. Cópialo completo desde @BotFather.",
  bot_en_otro_negocio: "Ese bot ya está conectado en otro negocio. Desconéctalo allá o crea otro bot en @BotFather.",
  webhook_ajeno: "Ese bot ya manda sus mensajes a otra dirección. Confirma que quieres reemplazarla.",
  conexion_pausada: "La conexión está pausada: reanúdala para hacer esto.",
  otro_bot: "Ese token es de otro bot. Para conectar otro bot, agrégalo como una conexión nueva.",
  chat_no_iniciado: "Ese chat no le ha escrito al bot. Ábrelo en Telegram, toca Iniciar (/start) y vuelve a probar.",
  token_revocado: "Telegram rechazó el token del bot. Cámbialo en Credenciales.",
  telegram_unavailable: "Telegram no respondió. Vuelve a intentar en unos minutos.",
  telegram_webhook_no_registrado:
    "El bot quedó guardado, pero Telegram no confirmó la dirección de los mensajes. Vuelve a intentar.",
  url_publica_no_https: "Este entorno no tiene una dirección pública segura (https) para recibir mensajes de Telegram.",
  webhook_no_eliminado:
    "No se pudo quitar el webhook del bot en Telegram, así que no se desconectó nada. Vuelve a intentar, o desconecta igual.",
  too_many_tests: "Espera unos segundos antes de mandar otra prueba.",
  daily_limit: "Ya mandaste las 10 pruebas de hoy. Vuelve a intentar mañana.",
  password_required: "Escribe tu contraseña para continuar.",
  password_incorrect: "La contraseña no es correcta.",
};

export function mensajeErrorTelegram(code: string | undefined, fallback: string): string {
  return (code && ERRORES[code]) || fallback;
}

/** La dirección a la que el bot ya mandaba sus mensajes (`details.webhook_url` del 409 `webhook_ajeno`). */
export function webhookAjeno(details: Record<string, unknown> | undefined): string | null {
  const url = details?.webhook_url;
  return typeof url === "string" && url ? url : null;
}

const ESTADOS: Record<string, { label: string; tono: Tono; detalle: string }> = {
  connected: { label: "Funciona", tono: "success", detalle: "El bot recibe y responde mensajes por solvershub." },
  pending: { label: "Sin terminar", tono: "info", detalle: "El alta no terminó: vuelve a revisar o repara el webhook." },
  degraded: {
    label: "Con avisos",
    tono: "warning",
    detalle: "Otro sistema cambió el webhook del bot, o Telegram no pudo entregar mensajes hace poco.",
  },
  revoked: {
    label: "No funciona",
    tono: "danger",
    detalle: "Telegram rechaza el token (¿lo revocaste en @BotFather?): pega el nuevo en Credenciales.",
  },
  error: { label: "No funciona", tono: "danger", detalle: "Telegram respondió con un error en la última revisión." },
};

/** Estado del bot en palabras, con su tono y qué hacer. */
export function estadoTelegram(status: string): { label: string; tono: Tono; detalle: string } {
  return ESTADOS[status] ?? { label: status || "Sin revisar", tono: "neutral", detalle: "" };
}

/** «@mi_bot» (o «Bot de Telegram» si todavía no se sabe el usuario). */
export function usuarioDeBot(username: string | null | undefined): string {
  const u = (username ?? "").trim().replace(/^@/, "");
  return u ? `@${u}` : "Bot de Telegram";
}

/** Enlace para abrir el chat con el bot en Telegram (`https://t.me/<usuario>`), o `null` sin usuario. */
export function enlaceDeBot(username: string | null | undefined): string | null {
  const u = (username ?? "").trim().replace(/^@/, "");
  return /^[A-Za-z0-9_]{5,64}$/.test(u) ? `https://t.me/${u}` : null;
}

/** Aviso al terminar de desconectar (`webhook_quitado` de la respuesta). */
export function avisoDesconectadoTelegram(webhookQuitado: boolean): string {
  return webhookQuitado
    ? "Bot desconectado. Se le quitó el webhook: Telegram deja de mandarle mensajes a solvershub."
    : "Bot desconectado. Su webhook ya apuntaba a otra dirección o no se pudo quitar: revísalo con @BotFather si hace falta.";
}

/** El id del chat de prueba: un número entero (los de usuarios son positivos). */
export function errorDeChatId(valor: string): string | undefined {
  const limpio = valor.trim();
  if (!limpio) return "Escribe el id del chat.";
  if (!/^-?\d{1,20}$/.test(limpio)) return "El id del chat es un número, por ejemplo 123456789.";
  return undefined;
}

const BASE_BACKEND = "/admin/connections/telegram";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POST_DE_CONEXION = new Set(["refresh", "webhooks", "test-message", "disconnect"]);

/**
 * Rutas del BFF (`/api/connections/telegram/**`) → ruta del backend (`/admin/connections/telegram/**`). Lista cerrada:
 * conectar y listar en la raíz, ver un bot por su id (UUID) y sus acciones con su método.
 */
export function rutaTelegramDeBackend(metodo: string, segmentos: readonly string[]): string | null {
  const m = metodo.toUpperCase();
  if (segmentos.length === 0) return m === "POST" || m === "GET" ? BASE_BACKEND : null;
  const [id, accion] = segmentos;
  if (!UUID.test(id)) return null;
  if (segmentos.length === 1) return m === "GET" ? `${BASE_BACKEND}/${id}` : null;
  if (segmentos.length !== 2) return null;
  if (m === "POST" && POST_DE_CONEXION.has(accion)) return `${BASE_BACKEND}/${id}/${accion}`;
  if (m === "PUT" && accion === "credentials") return `${BASE_BACKEND}/${id}/credentials`;
  return null;
}
