/**
 * Errores de validación de la API (422 de FastAPI): llegan como `detail: [{loc, msg, type}]`
 * con mensajes en inglés. El panel no los muestra tal cual: dice en español qué campos
 * revisar.
 */

type DetalleDeValidacion = { loc?: unknown[]; msg?: string };

/** Nombres de los campos con error (sin `body`/`query`), sin repetir. */
export function camposConError(detail: unknown): string[] {
  if (!Array.isArray(detail)) return [];
  const campos: string[] = [];
  for (const item of detail as DetalleDeValidacion[]) {
    const loc = Array.isArray(item?.loc) ? item.loc : [];
    const campo = loc.filter((parte) => typeof parte === "string" && !["body", "query", "path"].includes(parte)).at(-1);
    if (typeof campo === "string" && !campos.includes(campo)) campos.push(campo);
  }
  return campos;
}

/** Mensaje en español para un 422. */
export function mensajeDeValidacion(detail: unknown): string {
  const campos = camposConError(detail);
  if (campos.length === 0) return "Hay datos que no se pudieron guardar. Revisa el formulario e inténtalo de nuevo.";
  return `Hay datos que no se pudieron guardar. Revisa: ${campos.join(", ")}.`;
}
