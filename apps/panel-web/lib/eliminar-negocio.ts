/**
 * Eliminar un negocio (borrado físico, invariante 8). agent-core solo purga negocios
 * suspendidos (`tenants.status = 'suspended'`, agent-core #408): con el negocio activo
 * la API responde 409 `tenant_not_suspended`.
 */

/** Solo un negocio desactivado (suspendido por el ciclo de vida) se puede eliminar. */
export function sePuedeEliminar(status: string): boolean {
  return status === "suspended";
}

export const AVISO_DESACTIVAR_PRIMERO =
  "Para eliminar un negocio, primero hay que desactivarlo. Desactívalo y luego escribe la frase de confirmación.";

export const MENSAJE_NO_SUSPENDIDO =
  "No se eliminó: el negocio sigue activo. Desactívalo primero y vuelve a intentarlo.";

/** Mensaje para el usuario a partir del error de la API (código estable + texto del core). */
export function mensajeErrorNegocio(error: { code?: string; error: string }): string {
  if (error.code === "tenant_not_suspended") return MENSAJE_NO_SUSPENDIDO;
  return error.error;
}
