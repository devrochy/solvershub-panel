import type { Me } from "@/lib/api/types";
import type { Permisos } from "@/lib/shell/navegacion";

/**
 * Nivel de acceso de las páginas de la Wiki (`acceso` en su frontmatter) y de quien lee:
 * - `usuario`: cualquier sesión.
 * - `administrador`: el dueño del negocio, los colaboradores con permiso de Equipo o
 *   Configuración, y el equipo de plataforma.
 * - `tecnico`: solo el equipo de plataforma (`master` y `tester`).
 */
export type NivelAyuda = "usuario" | "administrador" | "tecnico";

const ORDEN: Record<NivelAyuda, number> = { usuario: 0, administrador: 1, tecnico: 2 };

/** Secciones del RBAC (ADR-0047) que hacen administrador a un colaborador: Equipo y Configuración. */
export const SECCIONES_DE_ADMINISTRADOR = ["collaborators", "settings"] as const;

/** Lo que se lee de `/admin/me` para decidir el nivel. */
export type SesionAyuda = Pick<Me, "role" | "tenant" | "permissions">;

/** Roles de plataforma: ven la documentación técnica (el tester actúa como master en las pruebas). */
function esPlataforma(rol: string): boolean {
  return rol === "master" || rol === "tester";
}

function tienePermiso(permisos: Permisos, seccion: string): boolean {
  return Boolean(permisos?.[seccion]);
}

export function nivelDeSesion(sesion: SesionAyuda): NivelAyuda {
  if (esPlataforma(sesion.role)) return "tecnico";
  if (sesion.tenant?.role === "owner") return "administrador";
  if (SECCIONES_DE_ADMINISTRADOR.some((s) => tienePermiso(sesion.permissions, s))) return "administrador";
  return "usuario";
}

/** Un nivel alcanza una página si es igual o superior al que ella pide. */
export function nivelAlcanza(nivel: NivelAyuda, requerido: string): boolean {
  // Un `acceso` desconocido no se muestra a nadie: es más seguro ocultar que publicar por error.
  if (!(requerido in ORDEN)) return false;
  return ORDEN[nivel] >= ORDEN[requerido as NivelAyuda];
}

export const ETIQUETA_DE_NIVEL: Record<NivelAyuda, string | null> = {
  usuario: null,
  administrador: "Solo para quien administra el negocio",
  tecnico: "Solo para el equipo de plataforma",
};
