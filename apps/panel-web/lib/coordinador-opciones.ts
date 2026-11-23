import { apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";
import { puedeEditarConfiguracion } from "@/lib/configuracion-secciones";
import type { OpcionesDelCoordinador } from "@/lib/coordinador-voz";

export type CargaDelCoordinador =
  | { estado: "error"; detalle?: string }
  | { estado: "ok"; opciones: OpcionesDelCoordinador; puedeEditar: boolean };

/** Las opciones propias del Coordinador (HU-AOS-98). La API las lee con el permiso de Configuración. */
export async function cargarOpcionesDelCoordinador(): Promise<CargaDelCoordinador> {
  const [opciones, me] = await Promise.all([apiFetch<OpcionesDelCoordinador>("/admin/coordinator"), apiFetch<Me>("/admin/me")]);
  if (!opciones.ok) return { estado: "error", detalle: opciones.error };
  return { estado: "ok", opciones: opciones.data, puedeEditar: me.ok && puedeEditarConfiguracion(me.data) };
}
