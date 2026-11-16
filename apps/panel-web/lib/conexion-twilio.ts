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
export type CapacidadesTwilio = components["schemas"]["TwilioCapacidadesOut"];
export type ResultadoPruebaTwilio = components["schemas"]["TwilioPruebaEstadoOut"];
export type PlantillaTwilio = components["schemas"]["TwilioPlantillaOut"];
export type PlantillaTwilioIn = components["schemas"]["TwilioPlantillaIn"];

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
const SID_DE_MENSAJE = /^(SM|MM)[0-9a-f]{32}$/;

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
  webhooks_no_restaurados:
    "No se pudieron devolver los webhooks anteriores al número, así que no se desconectó nada. Vuelve a intentar, o desconecta sin devolverlos.",
  join_code_invalido: "El código de unión son las palabras que siguen a «join», por ejemplo cloud-forgotten.",
  sandbox_webhook_manual:
    "En el Sandbox las direcciones se pegan a mano en la consola de Twilio (Sandbox settings): cópialas de Recepción de mensajes.",
  sandbox_otra_cuenta: "Este sandbox es de otra cuenta de Twilio. Para usar otra cuenta, conecta su sandbox aparte.",
  no_aplica_sandbox: "En el Sandbox solo sirven las plantillas preaprobadas de Twilio: usa Sincronizar para traerlas.",
  no_es_sandbox: "Esta conexión no es del Sandbox de Twilio.",
  nombre_en_uso: "Ya hay una plantilla con ese nombre en esta conexión. Usa otro nombre.",
  plantilla_sin_crear: "La plantilla todavía no existe en Twilio: créala de nuevo con el mismo nombre.",
  sync_rate_limited: "Ya sincronizaste hace un momento. Espera un minuto y vuelve a intentar.",
  password_required: "Escribe tu contraseña para continuar.",
  password_incorrect: "La contraseña no es correcta.",
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
export function estadoTwilio(status: string, modo?: string): { label: string; tono: Tono; detalle: string } {
  if (modo === MODO_SANDBOX && status === "pending") {
    return {
      label: "Falta un paso",
      tono: "info",
      detalle:
        "Pega las dos direcciones de Recepción de mensajes en la consola de Twilio y escríbele al sandbox: con el primer mensaje queda funcionando.",
    };
  }
  return ESTADOS[status] ?? { label: status || "Sin revisar", tono: "neutral", detalle: "" };
}

/** Modo Sandbox de WhatsApp de Twilio (HU-CONN-20): número compartido, solo en el entorno de pruebas. */
export const MODO_SANDBOX = "sandbox";

export function esSandbox(c: Pick<ConexionTwilio, "modo">): boolean {
  return c.modo === MODO_SANDBOX;
}

const JOIN_CODE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** El código de unión es opcional en el alta; si viene, en minúsculas, números y guiones (máx. 64). */
export function errorDeJoinCode(codigo: string): string | undefined {
  const limpio = codigo.trim().toLowerCase();
  if (!limpio) return undefined;
  if (limpio.length > 64 || !JOIN_CODE.test(limpio)) {
    return "Escribe solo las palabras que siguen a «join», por ejemplo cloud-forgotten.";
  }
  return undefined;
}

/** Lo que cada teléfono de prueba le manda al sandbox para unirse: «join cloud-forgotten». */
export function mensajeDeUnion(joinCode: string | null | undefined): string {
  const codigo = (joinCode ?? "").trim();
  return codigo ? `join ${codigo}` : "join <tu código>";
}

/** «+14155238886» → «+1 415 523 8886» (el número del sandbox, que es de EE. UU.). */
export function numeroLegible(e164: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `+1 ${m[1]} ${m[2]} ${m[3]}` : e164;
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

/**
 * Aviso al terminar de desconectar (`webhooks_restaurados` de la respuesta). Sin restaurar puede ser porque no se
 * pidió o porque el número ya mandaba sus mensajes a otra integración (el backend no la pisa).
 */
export function avisoDesconectado(
  webhooksRestaurados: boolean,
  seRestauraba: boolean,
  requiereLimpiarConsola = false,
): string {
  if (requiereLimpiarConsola) {
    return "Sandbox desconectado. Borra las dos direcciones de Sandbox settings en la consola de Twilio: mientras sigan ahí, Twilio recibe un error sin efecto.";
  }
  if (webhooksRestaurados) return "Número desconectado. Sus webhooks volvieron a la dirección que tenían antes.";
  if (seRestauraba) return "Número desconectado. Sus webhooks ya apuntaban a otra dirección y no se tocaron.";
  return "Número desconectado. Sus webhooks quedaron como estaban en Twilio.";
}

const BASE_BACKEND = "/admin/connections/twilio";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POST_DE_CONEXION = new Set(["refresh", "webhooks", "test-message", "disconnect"]);

/**
 * Rutas del BFF (`/api/connections/twilio/**`) → ruta del backend (`/admin/connections/twilio/**`). Lista cerrada:
 * solo se reenvía lo que usa el alta y la ficha (P-1, más desconectar, el Sandbox de HU-CONN-20 y las plantillas de
 * P-2), con su método y un id con forma de UUID. Los días de Costos se acotan a 1–90 como el backend.
 */
export function rutaTwilioDeBackend(metodo: string, segmentos: readonly string[], dias?: string | null): string | null {
  const m = metodo.toUpperCase();
  if (segmentos.length === 0) return m === "POST" ? BASE_BACKEND : null;
  const [primero, segundo] = segmentos;
  if (segmentos.length === 1) {
    if (m === "POST" && primero === "discover") return `${BASE_BACKEND}/discover`;
    if (m === "GET" && primero === "capabilities") return `${BASE_BACKEND}/capabilities`;
    if (m === "POST" && primero === "sandbox") return `${BASE_BACKEND}/sandbox`;
    if (m === "GET" && UUID.test(primero)) return `${BASE_BACKEND}/${primero}`;
    return null;
  }
  if (!UUID.test(primero)) return null;
  if (segundo === "templates") return rutaDePlantillas(m, `${BASE_BACKEND}/${primero}/templates`, segmentos.slice(2));
  if (segmentos.length === 3) {
    const sid = segmentos[2];
    // Resultado de la última prueba: `GET {id}/test-message/{SM…}`.
    if (m === "GET" && segundo === "test-message" && SID_DE_MENSAJE.test(sid)) {
      return `${BASE_BACKEND}/${primero}/test-message/${sid}`;
    }
    return null;
  }
  if (segmentos.length !== 2) return null;
  if (m === "POST" && POST_DE_CONEXION.has(segundo)) return `${BASE_BACKEND}/${primero}/${segundo}`;
  if (m === "PUT" && segundo === "credentials") return `${BASE_BACKEND}/${primero}/credentials`;
  if (m === "PATCH" && segundo === "sandbox") return `${BASE_BACKEND}/${primero}/sandbox`;
  if (m === "GET" && segundo === "costs") {
    const n = Number(dias ?? 30);
    const acotado = Number.isInteger(n) ? Math.min(90, Math.max(1, n)) : 30;
    return `${BASE_BACKEND}/${primero}/costs?dias=${acotado}`;
  }
  return null;
}

/**
 * Lo que se ve tras mandar la prueba. Twilio acepta el envío y el rechazo (63015 del Sandbox, 63016 fuera de la
 * ventana…) llega después: la ficha consulta el resultado unos segundos. `final` corta la consulta; si se acaba el
 * tiempo (`vencido`) sin saber si llegó, se dice así, nunca «entregado».
 */
export function resultadoDePrueba(
  r: Pick<ResultadoPruebaTwilio, "estado" | "motivo"> | null,
  vencido: boolean,
): { label: string; tono: Tono; detalle: string; final: boolean } {
  switch (r?.estado) {
    case "read":
      return { label: "Leído", tono: "success", detalle: "El mensaje llegó y lo abrieron en ese WhatsApp.", final: true };
    case "failed":
      return { label: "No llegó", tono: "danger", detalle: r.motivo || "WhatsApp no entregó el mensaje.", final: true };
    case "delivered":
      return { label: "Entregado", tono: "success", detalle: "El mensaje llegó al WhatsApp de ese número.", final: vencido };
  }
  if (vencido) {
    return {
      label: "Sin confirmar",
      tono: "warning",
      detalle: "Twilio aún no confirma la entrega. Si no llega en un minuto, revisa el número y vuelve a probar.",
      final: true,
    };
  }
  if (r?.estado === "sent") {
    return { label: "Enviado", tono: "info", detalle: "WhatsApp lo recibió; esperando que llegue al teléfono…", final: false };
  }
  return { label: "Enviando", tono: "info", detalle: "Twilio aceptó la prueba; esperando a WhatsApp…", final: false };
}

/** Plantillas de una conexión: listar y crear, sincronizar, y enviar, refrescar o borrar una (con id UUID). */
function rutaDePlantillas(metodo: string, base: string, resto: readonly string[]): string | null {
  const [primero, segundo] = resto;
  if (resto.length === 0) return metodo === "GET" || metodo === "POST" ? base : null;
  if (resto.length === 1) {
    if (primero === "sync") return metodo === "POST" ? `${base}/sync` : null;
    return metodo === "DELETE" && UUID.test(primero) ? `${base}/${primero}` : null;
  }
  if (resto.length === 2 && metodo === "POST" && UUID.test(primero) && (segundo === "submit" || segundo === "refresh")) {
    return `${base}/${primero}/${segundo}`;
  }
  return null;
}

// --------------------------------------------------------------------------- plantillas (HU-CONN-14, P-2)

/** Categorías de WhatsApp que acepta el backend (`TwilioPlantillaIn.categoria`). */
export const CATEGORIAS_PLANTILLA_TWILIO = ["UTILITY", "MARKETING", "AUTHENTICATION"] as const;

const NOMBRE_PLANTILLA = /^[a-z0-9_]{1,64}$/;
const IDIOMA_PLANTILLA = /^[a-z]{2}(_[A-Z]{2})?$/;
// La misma expresión que `_PLACEHOLDER` del paquete de Twilio: admite espacios dentro de las llaves.
const VARIABLE = /\{\{\s*(\d+)\s*\}\}/g;
export const MAX_CUERPO_PLANTILLA = 1024;
export const MAX_EJEMPLO_PLANTILLA = 256;

/** Números de las variables `{{n}}` del texto, ordenados y sin repetir. */
export function variablesDeCuerpo(cuerpo: string): number[] {
  const vistos = new Set<number>();
  for (const m of cuerpo.matchAll(VARIABLE)) vistos.add(Number(m[1]));
  return [...vistos].sort((a, b) => a - b);
}

export type ErroresDePlantilla = Partial<Record<"nombre" | "idioma" | "categoria" | "cuerpo" | "ejemplos", string>>;

/**
 * Las reglas del backend (`plantillas.validar` y `validate_variables`) antes de llamar a Twilio: nombre en minúsculas,
 * números y guion bajo; idioma `es` o `es_CO`; las variables de `{{1}}` en adelante sin saltos y cada una con su
 * ejemplo (WhatsApp la rechaza si no); ningún ejemplo de una variable que el texto no usa.
 */
export function erroresDePlantilla(p: PlantillaTwilioIn): ErroresDePlantilla {
  const errores: ErroresDePlantilla = {};
  if (!NOMBRE_PLANTILLA.test(p.nombre.trim())) {
    errores.nombre = "Usa minúsculas, números y guion bajo (hasta 64), por ejemplo recordatorio_cita.";
  }
  if (!IDIOMA_PLANTILLA.test(p.idioma.trim())) errores.idioma = "Elige un idioma.";
  if (!(CATEGORIAS_PLANTILLA_TWILIO as readonly string[]).includes(p.categoria)) errores.categoria = "Elige una categoría.";
  if (!p.cuerpo.trim()) errores.cuerpo = "Escribe el mensaje.";
  else if (p.cuerpo.length > MAX_CUERPO_PLANTILLA) errores.cuerpo = `El mensaje no puede pasar de ${MAX_CUERPO_PLANTILLA} caracteres.`;
  const usadas = variablesDeCuerpo(p.cuerpo);
  const consecutivas = usadas.every((n, i) => n === i + 1);
  if (!consecutivas) {
    errores.cuerpo ??= `Las variables van de {{1}} a {{${usadas.length}}} sin saltos (hay ${usadas.map((n) => `{{${n}}}`).join(", ")}).`;
    return errores;
  }
  const ejemplos = p.ejemplos ?? {};
  const faltan = usadas.filter((n) => !(ejemplos[String(n)] ?? "").trim());
  const largos = usadas.filter((n) => (ejemplos[String(n)] ?? "").length > MAX_EJEMPLO_PLANTILLA);
  const sobran = Object.keys(ejemplos).filter((k) => !usadas.includes(Number(k)) || !/^\d+$/.test(k));
  if (faltan.length > 0) errores.ejemplos = `Escribe un ejemplo para ${faltan.map((n) => `{{${n}}}`).join(", ")}: WhatsApp lo pide para aprobarla.`;
  else if (largos.length > 0) errores.ejemplos = `Cada ejemplo tiene hasta ${MAX_EJEMPLO_PLANTILLA} caracteres.`;
  else if (sobran.length > 0) errores.ejemplos = "Hay ejemplos de variables que el mensaje ya no usa.";
  return errores;
}

/** El cuerpo de `POST …/templates`: solo los ejemplos de las variables que usa el texto, sin espacios sobrantes. */
export function cuerpoDePlantilla(p: PlantillaTwilioIn): PlantillaTwilioIn {
  const usadas = variablesDeCuerpo(p.cuerpo);
  const ejemplos = Object.fromEntries(usadas.map((n) => [String(n), (p.ejemplos?.[String(n)] ?? "").trim()]));
  return { nombre: p.nombre.trim(), idioma: p.idioma.trim(), categoria: p.categoria, cuerpo: p.cuerpo, ejemplos };
}

const ESTADOS_PLANTILLA: Record<string, { label: string; tono: Tono }> = {
  creating: { label: "Creándose", tono: "info" },
  unsubmitted: { label: "Sin enviar", tono: "neutral" },
  received: { label: "En revisión", tono: "warning" },
  pending: { label: "En revisión", tono: "warning" },
  approved: { label: "Aprobada", tono: "success" },
  rejected: { label: "Rechazada", tono: "danger" },
  paused: { label: "Pausada", tono: "warning" },
  disabled: { label: "Desactivada", tono: "danger" },
};

/** Estado de la aprobación de WhatsApp en palabras (Twilio lo da en minúsculas). */
export function estadoPlantillaTwilio(estado: string): { label: string; tono: Tono } {
  return ESTADOS_PLANTILLA[estado] ?? { label: estado || "Sin estado", tono: "neutral" };
}

/**
 * Qué se puede hacer con una plantilla. En el Sandbox (HU-CONN-20) solo sirven las preaprobadas de Twilio: no se
 * envían ni se borran (el backend responde 409 `no_aplica_sandbox`). Sin `content_sid` todavía no existe en Twilio:
 * se repite la creación con el mismo nombre.
 */
export function accionesDePlantilla(
  p: Pick<PlantillaTwilio, "estado" | "content_sid">,
  sandbox: boolean,
): { enviar: boolean; refrescar: boolean; borrar: boolean } {
  return {
    enviar: !sandbox && Boolean(p.content_sid) && p.estado === "unsubmitted",
    refrescar: Boolean(p.content_sid),
    borrar: !sandbox,
  };
}
