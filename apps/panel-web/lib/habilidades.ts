/**
 * Habilitar y deshabilitar habilidades (P0 de pruebas): el interruptor refleja lo que la API
 * aceptó, y el tope del plan se explica en claro.
 */

/** `Tu plan no permite habilitar más habilidades (2/2).` → las dos cifras. */
const CUPO = /\((\d+)\s*\/\s*(\d+)\)/;

/**
 * Mensaje para el usuario cuando la API no deja habilitar una habilidad. Si el error trae el
 * cupo del plan (`usadas/limite`), lo dice con el número; si no, el texto de la API.
 */
export function mensajeDeHabilitacion(error: string | undefined, status: number): string {
  const cupo = error ? CUPO.exec(error) : null;
  if (cupo) {
    const limite = Number(cupo[2]);
    const plural = limite === 1 ? "habilidad" : "habilidades";
    return `Tu plan permite ${limite} ${plural} y ya las usas todas. Deshabilita una o mejora el plan para habilitar otra.`;
  }
  if (error) return error;
  return status === 403
    ? "Tu plan no permite habilitar esta habilidad."
    : "No se pudo completar la acción. Inténtalo de nuevo.";
}
