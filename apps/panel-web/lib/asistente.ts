import type { SettingsResponse } from "@/lib/api/types";

/**
 * Cuerpo de `PUT /admin/settings/identity` que solo cambia `bot_paused` (HU-UI-03).
 *
 * El backend reescribe **todos** los campos de identidad con lo que recibe (lo que falta
 * vuelve a su valor por defecto), así que pausar o reactivar desde la barra superior
 * reenvía la identidad completa que acaba de leer y cambia únicamente `bot_paused`.
 * Los campos de solo lectura de la respuesta (`available_guardrails`,
 * `brand_voice_warning`) no se reenvían.
 */
export function identidadConPausa(identity: SettingsResponse["identity"], pausado: boolean) {
  const editable: Partial<SettingsResponse["identity"]> = { ...identity, bot_paused: pausado };
  delete editable.available_guardrails;
  delete editable.brand_voice_warning;
  return editable;
}

/** El usuario puede pausar o reactivar el asistente si escribe en Configuración. */
export function puedeEditarAsistente(permissions: Record<string, unknown> | null | undefined): boolean {
  return permissions?.settings === "write";
}
