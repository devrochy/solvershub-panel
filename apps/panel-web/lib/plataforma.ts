/**
 * Plataforma (PLT): textos en palabras para Negocios, Alta automática, App de Meta y Crons.
 */

const MESES_CORTOS = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** «12 de oct.»; una fecha sin hora (`2026-10-12`) se lee tal cual. */
export function diaEnPalabras(valor: string | null | undefined): string {
  if (!valor) return "—";
  const soloDia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (soloDia) return `${Number(soloDia[3])} de ${MESES_CORTOS[Number(soloDia[2]) - 1]}`;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return `${fecha.getDate()} de ${MESES_CORTOS[fecha.getMonth()]}`;
}

/** Versión de un documento legal: «2026-10» → «octubre de 2026»; otra, tal cual. */
export function versionEnPalabras(version: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(version);
  return m ? `${MESES[Number(m[2]) - 1]} de ${m[1]}` : version;
}

/**
 * Cómo arreglar un chequeo de la App de Meta (PLT-07). La revisión de la plataforma no manda
 * `repair_action`: el arreglo sale de la clave del chequeo (`core/gateway/meta_production_readiness.py`).
 */
const ARREGLOS: Record<string, string> = {
  meta_app_configured: "Carga META_APP_ID, META_APP_SECRET y META_CONFIG_ID en las variables del API (Coolify) y vuelve a desplegar.",
  prod_secret_differs_from_dev: "Usa en producción un secreto de la app distinto del de desarrollo: genéralo en Meta for Developers y cámbialo en Coolify.",
  webhook_handshake: "Revisa que la URL pública del API responda por HTTPS y que el token de verificación del webhook coincida con el de Meta.",
  app_subscriptions_complete: "En Meta for Developers › Webhooks, suscribe la app a los campos de WhatsApp que faltan.",
  token_keys_configured: "Revisa TOKEN_MASTER_KEYS y TOKEN_ACTIVE_KEY_ID en Coolify: la clave activa debe existir y medir 32 bytes en base64.",
  worker_heartbeat_and_dlq: "Revisa que los trabajadores en segundo plano estén corriendo y vacía los mensajes fallidos en Configuración › Mensajes fallidos.",
  rls_forced: "Hay tablas sin aislamiento entre negocios: corre las migraciones pendientes y revisa la seguridad por fila de la base.",
  rls_tests_pass: "Corre las pruebas de aislamiento entre negocios y arregla las que fallen antes de pasar a producción.",
  no_secret_leak_in_templates: "Quita de las plantillas los valores que parecen secretos o variables internas.",
  connections_health: "Abre Conexiones y arregla las conexiones de WhatsApp con chequeos en rojo.",
};

export function comoArreglar(key: string): string | null {
  return ARREGLOS[key] ?? null;
}
