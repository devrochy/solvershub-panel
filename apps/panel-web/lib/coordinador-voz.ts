import type { components } from "@/lib/api/schema";

export type OpcionesDelCoordinador = components["schemas"]["CoordinatorOptions"];

/** Lo que cambió entre dos estados de la voz; la API es parcial, así que solo se envía eso. */
export function cambiosDeVoz(
  antes: Pick<OpcionesDelCoordinador, "assistant_name" | "business_description" | "brand_voice">,
  ahora: Pick<OpcionesDelCoordinador, "assistant_name" | "business_description" | "brand_voice">,
): Partial<Pick<OpcionesDelCoordinador, "assistant_name" | "business_description" | "brand_voice">> {
  const salida: Partial<typeof ahora> = {};
  for (const clave of ["assistant_name", "business_description", "brand_voice"] as const) {
    if (antes[clave] !== ahora[clave]) salida[clave] = ahora[clave];
  }
  return salida;
}
