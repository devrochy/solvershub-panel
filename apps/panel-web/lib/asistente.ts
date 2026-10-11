import type { IdentitySettings } from "@/lib/api/types";

/**
 * Cuerpo de `PUT /admin/settings/identity`. `bot_paused` solo viaja si el usuario movió el
 * interruptor: si no, el backend lo deja como está y guardar no deshace una pausa hecha
 * desde la barra superior mientras el formulario estaba abierto.
 */
export function cuerpoIdentidad(values: IdentitySettings, inicial: IdentitySettings) {
  const { bot_paused, ...resto } = values;
  return {
    ...resto,
    business_tz: values.timezone,
    ...(bot_paused !== inicial.bot_paused ? { bot_paused } : {}),
  };
}

/** El usuario puede pausar o reactivar el asistente si escribe en Configuración. */
export function puedeEditarAsistente(permissions: Record<string, unknown> | null | undefined): boolean {
  return permissions?.settings === "write";
}
