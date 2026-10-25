import type { WawebPolitica } from "@/lib/api/types";

/**
 * Política anti-baneo de WhatsApp Web (SPEC-37, HU-CFG-05): solo la ve y la edita el master. Las
 * etiquetas, rangos y valores salen del catálogo; aquí solo se mapea entre la API y las claves
 * del catálogo.
 */
export const MODO_ENVIO_ABIERTO = "allow_outbound";

/** Clave del catálogo ↔ campo de la API de la política. */
export const CAMPOS_WAWEB = {
  waweb_mode: "mode",
  waweb_send_min_delay_ms: "send_min_delay_ms",
  waweb_send_max_delay_ms: "send_max_delay_ms",
  waweb_daily_outbound_cap: "daily_outbound_cap",
  waweb_warmup_enabled: "warmup_enabled",
} as const;

export type ClaveWaweb = keyof typeof CAMPOS_WAWEB;

export function valoresDePolitica(politica: WawebPolitica): Record<ClaveWaweb, unknown> {
  return Object.fromEntries(
    (Object.entries(CAMPOS_WAWEB) as [ClaveWaweb, keyof typeof politica][]).map(([clave, campo]) => [
      clave,
      politica[campo],
    ]),
  ) as Record<ClaveWaweb, unknown>;
}

/** Pasar a «Permitir envío no solicitado» exige aceptar el aviso de riesgo vigente. */
export function exigeAceptarRiesgo(valores: Record<string, unknown>, inicial: WawebPolitica): boolean {
  return valores.waweb_mode === MODO_ENVIO_ABIERTO && inicial.mode !== MODO_ENVIO_ABIERTO;
}

export function cuerpoWaweb(valores: Record<string, unknown>, inicial: WawebPolitica, aceptaRiesgo: boolean) {
  return {
    mode: String(valores.waweb_mode),
    send_min_delay_ms: Number(valores.waweb_send_min_delay_ms),
    send_max_delay_ms: Number(valores.waweb_send_max_delay_ms),
    daily_outbound_cap: Number(valores.waweb_daily_outbound_cap),
    warmup_enabled: valores.waweb_warmup_enabled === true,
    acepta_riesgo: aceptaRiesgo,
    risk_version: inicial.risk_version,
  };
}

/** Errores 422 de la API (por campo de la política) → por clave del catálogo; `acepta_riesgo` se queda. */
export function erroresPorClave(fields: Record<string, string> | undefined): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [clave, campo] of Object.entries(CAMPOS_WAWEB)) {
    const mensaje = fields?.[campo];
    if (mensaje) salida[clave] = mensaje;
  }
  if (fields?.acepta_riesgo) salida.acepta_riesgo = fields.acepta_riesgo;
  if (fields?.risk_version) salida.acepta_riesgo = fields.risk_version;
  return salida;
}
