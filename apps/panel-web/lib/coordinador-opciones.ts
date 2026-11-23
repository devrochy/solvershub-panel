import type { components } from "@/lib/api/schema";
import { apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";
import { puedeEditarConfiguracion } from "@/lib/configuracion-secciones";

export type OpcionesDelCoordinador = components["schemas"]["CoordinatorOptions"];

export type CargaDelCoordinador =
  | { estado: "error"; detalle?: string }
  | { estado: "ok"; opciones: OpcionesDelCoordinador; puedeEditar: boolean };

/** Las opciones propias del Coordinador (HU-AOS-98). La API las lee con el permiso de Configuración. */
export async function cargarOpcionesDelCoordinador(): Promise<CargaDelCoordinador> {
  const [opciones, me] = await Promise.all([apiFetch<OpcionesDelCoordinador>("/admin/coordinator"), apiFetch<Me>("/admin/me")]);
  if (!opciones.ok) return { estado: "error", detalle: opciones.error };
  return { estado: "ok", opciones: opciones.data, puedeEditar: me.ok && puedeEditarConfiguracion(me.data) };
}

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
