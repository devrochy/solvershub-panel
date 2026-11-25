import type { components } from "@/lib/api/schema";

export type OpcionesDelCoordinador = components["schemas"]["CoordinatorOptions"];

/** El nombre del asistente es de cada agente, no del Coordinador (que es el core): no se edita aquí.
 * Lo que cambió entre dos estados de la voz; la API es parcial, así que solo se envía eso. */
export function cambiosDeVoz(
  antes: Pick<OpcionesDelCoordinador, "business_description" | "brand_voice">,
  ahora: Pick<OpcionesDelCoordinador, "business_description" | "brand_voice">,
): Partial<Pick<OpcionesDelCoordinador, "business_description" | "brand_voice">> {
  const salida: Partial<typeof ahora> = {};
  for (const clave of ["business_description", "brand_voice"] as const) {
    if (antes[clave] !== ahora[clave]) salida[clave] = ahora[clave];
  }
  return salida;
}
