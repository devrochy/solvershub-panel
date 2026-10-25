import type { IdentitySettings } from "@/lib/api/types";

/**
 * Cuerpo de `PUT /admin/settings/identity`. `bot_paused` solo viaja si el usuario movió el
 * interruptor: si no, el backend lo deja como está y guardar no deshace una pausa hecha
 * desde la barra superior mientras el formulario estaba abierto.
 */
export function cuerpoIdentidad(values: IdentitySettings, inicial: IdentitySettings) {
  // `out_of_hours_default_message` es de solo lectura: no viaja en el PUT. `tono` está retirado
  // (SPEC-37, ADR-0166): no tenía efecto y la persona ya tiene su propio tono.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { bot_paused, out_of_hours_default_message, tono, ...resto } = values;
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

/**
 * Ayuda del campo «Mensaje fuera de horario»: qué recibe el cliente si escribe fuera del
 * horario de atención (adenda 2026-10-18 de ADR-0051 en agent-core).
 */
export function ayudaFueraDeHorario(
  mensaje: string,
  porDefecto: string,
  hayHorario: boolean,
): string {
  if (!hayHorario) {
    return "Sin horario de atención, el asistente responde siempre y este mensaje no se usa.";
  }
  if (mensaje.trim()) {
    return "Fuera de horario, el cliente recibe este mensaje cada vez que escribe, sin pasar por la IA. {assistant_name} se reemplaza por el nombre del asistente.";
  }
  const aviso = porDefecto.trim() ? `: «${porDefecto.trim()}»` : "";
  return `Vacío: fuera de horario, el cliente recibe el mensaje por defecto una vez por conversación cada 12 horas${aviso}`;
}
