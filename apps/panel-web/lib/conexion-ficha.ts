import { formatearIdentificador } from "@/lib/conversaciones/nombre";
import type { ConexionConsola } from "@/lib/conexiones";

/**
 * Ficha de conexión por tipo (HU-UX-09, D-37): reglas puras. Sin JSX ni fetch.
 *
 * Decisiones del dueño (2026-11-06): una ficha por número (`/conexiones/[id]` con el id de la
 * conexión de canal, para todos los tipos) y la pestaña Agentes solo en los canales; las
 * integraciones (Google, SMTP) no la tienen porque el backend responde 422.
 */

export type TipoDeFicha =
  | "whatsapp_meta"
  | "whatsapp_waweb"
  | "webchat"
  | "instagram"
  | "messenger"
  | "google_calendar"
  | "smtp"
  /** Otros canales manuales (Twilio, Plivo): credenciales y agentes. */
  | "manual";

export type Pestana =
  | "salud"
  | "numeros"
  | "plantillas"
  | "webhook"
  | "produccion"
  | "costos"
  | "agentes"
  | "versiones"
  | "vinculacion"
  | "estado"
  | "apariencia"
  | "instalacion"
  | "cuenta"
  | "agenda"
  | "credenciales";

const ETIQUETAS: Record<Pestana, string> = {
  salud: "Salud",
  numeros: "Números",
  plantillas: "Plantillas",
  webhook: "Webhook",
  produccion: "Producción",
  costos: "Costos",
  agentes: "Agentes",
  versiones: "Versiones",
  vinculacion: "Vinculación",
  estado: "Estado",
  apariencia: "Apariencia",
  instalacion: "Instalación",
  cuenta: "Cuenta",
  agenda: "Agenda",
  credenciales: "Credenciales",
};

/** Pestañas por tipo, en orden. La primera es la que abre `/conexiones/[id]`. */
export const PESTANAS_POR_TIPO: Record<TipoDeFicha, Pestana[]> = {
  whatsapp_meta: ["salud", "agentes", "numeros", "plantillas", "costos", "webhook", "produccion", "versiones"],
  whatsapp_waweb: ["estado", "agentes", "versiones"],
  webchat: ["apariencia", "instalacion", "agentes", "versiones"],
  instagram: ["cuenta", "agentes", "versiones"],
  messenger: ["cuenta", "agentes", "versiones"],
  google_calendar: ["cuenta", "agenda"],
  smtp: ["credenciales"],
  manual: ["credenciales", "agentes", "versiones"],
};

/** Pestañas que muestran datos de la cuenta de Meta (`meta_connection_id`), no del número. */
export const PESTANAS_DE_CUENTA_META: ReadonlySet<Pestana> = new Set([
  "salud",
  "numeros",
  "plantillas",
  "webhook",
  "produccion",
  "costos",
]);

type ConTipo = Pick<ConexionConsola, "type_id" | "meta_connection_id" | "conversational">;

export function tipoDeFicha(c: ConTipo): TipoDeFicha {
  switch (c.type_id) {
    case "whatsapp_meta":
      return "whatsapp_meta";
    case "whatsapp_waweb":
      return "whatsapp_waweb";
    case "webchat":
      return "webchat";
    case "instagram_meta":
      return "instagram";
    case "messenger_meta":
      return "messenger";
    case "google_calendar":
      return "google_calendar";
    case "email_smtp":
      return "smtp";
  }
  // Filas viejas sin `type_id` que salen por una cuenta de Meta: el WhatsApp oficial.
  if (!c.type_id && c.meta_connection_id) return "whatsapp_meta";
  return c.conversational ? "manual" : "smtp";
}

/**
 * Pestañas que van dentro de «Avanzado» en el WhatsApp oficial: así la ficha no pasa de seis
 * (HIG, tab-views). En los demás tipos caben todas.
 */
export const PESTANAS_AVANZADAS: ReadonlySet<Pestana> = new Set(["webhook", "produccion", "versiones"]);

export function pestanasDeFicha(
  id: string,
  tipo: TipoDeFicha,
): { slug: Pestana; href: string; label: string; avanzada: boolean }[] {
  return PESTANAS_POR_TIPO[tipo].map((slug) => ({
    slug,
    href: `/conexiones/${id}/${slug}`,
    label: ETIQUETAS[slug],
    avanzada: tipo === "whatsapp_meta" && PESTANAS_AVANZADAS.has(slug),
  }));
}

export function tienePestana(tipo: TipoDeFicha, pestana: Pestana): boolean {
  return PESTANAS_POR_TIPO[tipo].includes(pestana);
}

/** Ruta de la ficha (abre su primera pestaña). */
export function rutaDeFicha(c: Pick<ConexionConsola, "id">): string {
  return `/conexiones/${c.id}`;
}

const TIPO_LEGIBLE: Record<TipoDeFicha, string> = {
  whatsapp_meta: "WhatsApp oficial",
  whatsapp_waweb: "WhatsApp con QR",
  webchat: "Chat web",
  instagram: "Instagram",
  messenger: "Messenger",
  google_calendar: "Google Calendar",
  smtp: "Correo",
  manual: "Canal manual",
};

export function tipoLegible(tipo: TipoDeFicha): string {
  return TIPO_LEGIBLE[tipo];
}

/**
 * Número visible del WhatsApp oficial (lo que sincronizó Meta, `display_phone_number`): un celular
 * colombiano sale como «+57 300 555 0101»; otro país, como lo escribe Meta. `null` si no se conoce.
 */
export function numeroVisible(c: Pick<ConexionConsola, "display_phone_number">): string | null {
  const numero = c.display_phone_number?.trim();
  if (!numero) return null;
  const solo = digitos(numero);
  const colombiano = formatearIdentificador(solo);
  return colombiano !== solo ? colombiano : numero;
}

/** «Tipo legible · detalle» de la cabecera; el detalle es el número, la cuenta o el dominio. */
export function subtituloDeFicha(c: Pick<ConexionConsola, "external_id" | "display_phone_number">, tipo: TipoDeFicha): string {
  // En WhatsApp oficial `external_id` es el phone_number_id de Meta: el número es otro campo.
  const numero = tipo === "whatsapp_meta" ? numeroVisible(c) : null;
  if (numero) return `${tipoLegible(tipo)} · ${numero}`;
  const crudo = c.external_id?.trim();
  // Un número sin «+» se muestra como teléfono; un id numérico largo de Meta (Instagram) no dice nada al dueño.
  const detalle = !crudo ? crudo : tipo === "whatsapp_waweb" ? formatearIdentificador(crudo) : /^\d{12,}$/.test(crudo) ? "" : crudo;
  return detalle ? `${tipoLegible(tipo)} · ${detalle}` : tipoLegible(tipo);
}

/**
 * Un solo estado por conexión, en la lista y en la cabecera: une «activa» con la salud de la
 * cuenta de Meta, para no mostrar dos insignias que hay que interpretar juntas.
 */
export function estadoDeConexion(
  c: Pick<ConexionConsola, "active" | "health" | "meta_connection_id">,
): { label: string; tono: "success" | "warning" | "danger" | "neutral" | "info" } {
  if (c.health === "paused" || !c.active) return { label: "Pausada", tono: "neutral" };
  // Sin cuenta de Meta el backend solo informa activa o pausada (`consola_conexiones.salud`).
  if (!muestraSalud(c)) return { label: "Funciona", tono: "success" };
  if (c.health === "pending") return { label: "Sin terminar", tono: "info" };
  if (c.health === "error") return { label: "No funciona", tono: "danger" };
  if (c.health === "degraded") return { label: "Con avisos", tono: "warning" };
  return { label: "Funciona", tono: "success" };
}

/** ¿Necesita atención? Se avisa arriba de la lista con un enlace a su Salud. */
export function necesitaAtencion(c: Pick<ConexionConsola, "active" | "health" | "meta_connection_id">): boolean {
  return muestraSalud(c) && c.active && (c.health === "degraded" || c.health === "error");
}

/** ¿La lista muestra la salud? Solo en las conexiones que salen por una cuenta de Meta. */
export function muestraSalud(c: Pick<ConexionConsola, "meta_connection_id">): boolean {
  return c.meta_connection_id != null;
}

/** Conexiones de la misma cuenta de Meta (para «esta cuenta tiene N números»). */
export function numerosDeLaCuenta(items: ConexionConsola[], metaId: string | null): ConexionConsola[] {
  if (!metaId) return [];
  return items.filter((c) => c.meta_connection_id === metaId && tipoDeFicha(c) === "whatsapp_meta");
}

/**
 * Rutas viejas del hub de Meta (`/conexiones/meta/[metaId]/**`) → pestaña de la ficha. La parte
 * que sigue a la pestaña se conserva (`numeros/negocio`). `pasar-a-produccion` es un paso de
 * Producción.
 */
const SECCIONES_VIEJAS: Record<string, string> = {
  "": "salud",
  salud: "salud",
  credenciales: "webhook/credenciales",
  numeros: "numeros",
  plantillas: "plantillas",
  produccion: "produccion",
  "pasar-a-produccion": "produccion/pasar",
  webhook: "webhook",
};

export function destinoDeRutaMeta(resto: string[]): string {
  const [primera = "", ...demas] = resto;
  const base = SECCIONES_VIEJAS[primera];
  if (base === undefined) return "salud";
  return [base, ...demas].join("/");
}

/**
 * La conexión de canal que abre una cuenta de Meta: su número principal o el primero. `null` si
 * la cuenta no tiene números (la ruta vieja vuelve a la lista).
 */
export function conexionDeCuentaMeta(items: ConexionConsola[], metaId: string): ConexionConsola | null {
  const numeros = numerosDeLaCuenta(items, metaId);
  const todas = numeros.length > 0 ? numeros : items.filter((c) => c.meta_connection_id === metaId);
  return todas.find((c) => c.is_primary) ?? todas[0] ?? null;
}

/** La única conexión de un tipo, si hay exactamente una (para las rutas globales viejas). */
export function unicaDeTipo(items: ConexionConsola[], tipo: TipoDeFicha): ConexionConsola | null {
  const delTipo = items.filter((c) => tipoDeFicha(c) === tipo);
  return delTipo.length === 1 ? delTipo[0] : null;
}

/** Une ruta y query string (`?alta=1`, `?google=…` sobreviven a la redirección). */
export function conQuery(ruta: string, query: Record<string, string | string[] | undefined>): string {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(query)) {
    if (valor === undefined) continue;
    for (const v of Array.isArray(valor) ? valor : [valor]) params.append(clave, v);
  }
  const qs = params.toString();
  return qs ? `${ruta}?${qs}` : ruta;
}

/**
 * ¿Puede cambiar los agentes de la conexión? La misma regla de `connection_agents.py`: el master
 * siempre; los demás con `settings` de escritura, viendo `connections`, y el Agent OS (v3).
 */
export function puedeEditarAgentesDeConexion(
  me: { role?: string | null; permissions?: Record<string, string | null | undefined> | null },
  runtime: string,
): boolean {
  if (me.role === "master") return true;
  return runtime === "v3" && me.permissions?.settings === "write" && me.permissions?.connections != null;
}

const ROLES: Record<string, string> = { core: "Coordinador", specialist: "Especialista", backoffice: "Back-office" };

export function rolLegible(role: string): string {
  return ROLES[role] ?? role;
}

/** Mensajes de los 409/403 de `connection_agents.py` por `code` estable. */
const ERRORES_AGENTES: Record<string, string> = {
  aos_runtime_legacy:
    "Los agentes se activan con el Agent OS de este negocio: por ahora solo los edita el administrador.",
  core_missing: "Esta conexión todavía no tiene Coordinador: sin él no se pueden sumar especialistas.",
  core_required: "El Coordinador lo gestiona el sistema: no se deshabilita ni se quita.",
  not_specialist: "Solo se agregan especialistas: el Coordinador lo gestiona el sistema.",
  default_disabled: "El agente principal tiene que estar habilitado.",
  default_required: "La conexión necesita un agente principal: elige otro antes de cambiar este.",
  connection_not_conversational: "Esta conexión es una integración: no lleva agentes.",
};

export function mensajeErrorAgentes(code: string | undefined, fallback: string): string {
  return (code && ERRORES_AGENTES[code]) || fallback;
}

const digitos = (s: string) => s.replace(/\D/g, "");

/** Filas de costo por número que son de la cuenta (se comparan solo los dígitos). */
export function costosDeLaCuenta<T extends { phone_number: string }>(filas: T[], numeros: string[]): T[] {
  const propios = new Set(numeros.map(digitos).filter(Boolean));
  return filas.filter((f) => propios.has(digitos(f.phone_number)));
}

/**
 * Enlace a la salud de Meta que reemplaza a la página global (HU-UX-09): con una sola cuenta, su
 * pestaña Salud (la ruta vieja de la cuenta resuelve el número); con varias o ninguna, la lista,
 * que muestra la salud en cada fila Meta.
 */
export function enlaceSaludMeta(metaIds: string[]): string {
  const unicas = [...new Set(metaIds)];
  return unicas.length === 1 ? `/conexiones/meta/${encodeURIComponent(unicas[0])}/salud` : "/conexiones";
}

/** Id de `ChannelIcon` para la conexión (el catálogo de íconos no conoce `whatsapp_meta`). */
export function iconoDeConexion(c: Pick<ConexionConsola, "type_id" | "channel">): string {
  return c.type_id === "whatsapp_meta" ? "whatsapp" : (c.type_id ?? c.channel);
}
