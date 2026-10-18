import type { CollaboratorItem, Me } from "@/lib/api/types";
import { rolLabel, seccionLabel } from "@/lib/labels";

/**
 * Reglas de la sección Colaboradores (P0 de pruebas, ciclo 2026-10-13). Lógica pura: la
 * página y sus piezas solo la usan. Espejo de `core/admin/collaborators_service.py`: lo que
 * la API rechaza, aquí no se muestra ("nunca un 403 por diseño").
 */

export type Negocio = { slug: string; name: string };

/** Secciones que un dueño no puede otorgar: plataforma y la propia gestión de cuentas. */
const NO_OTORGABLES_POR_EL_DUENO = new Set(["tenants", "qa", "collaborators"]);

/** Roles de plataforma (ADR-0134): cuentas sobre las que solo actúa el master. */
const ROLES_DE_PLATAFORMA = new Set(["master", "tester"]);

/** ¿La sesión gestiona la plataforma (campo de negocio, vincular, crear masters)? Solo el master. */
export function esMasterDePlataforma(me: Pick<Me, "role">): boolean {
  return me.role === "master";
}

/** "lectura" / "escritura" / "sin acceso" en vez de `read` / `write` / `none`. */
export function accesoLabel(access: string): string {
  if (access === "write") return "escritura";
  if (access === "none") return "sin acceso";
  return "lectura";
}

/**
 * Permiso legible: «Conversaciones: escritura». Con `nombresPorSlug` (master, que ve varios
 * negocios), un permiso acotado a un negocio lleva su nombre: «… · Tienda Norte». Un dueño
 * solo ve los permisos de su negocio, así que no hace falta repetirlo.
 */
export function permisoLegible(
  permiso: { section: string; access: string; scope: string },
  nombresPorSlug?: Record<string, string>,
): string {
  const base = `${seccionLabel(permiso.section)}: ${accesoLabel(permiso.access)}`;
  if (!nombresPorSlug || permiso.scope === "*") return base;
  return `${base} · ${nombresPorSlug[permiso.scope] ?? permiso.scope}`;
}

/** «Tienda Norte · Dueño» para cada vínculo. */
export function vinculoLegible(link: { name: string; role: string }): string {
  return `${link.name} · ${rolLabel(link.role)}`;
}

/** Negocios distintos entre los vínculos de las filas, por nombre. */
export function negociosDeFilas(filas: CollaboratorItem[]): Negocio[] {
  const porSlug = new Map<string, Negocio>();
  for (const fila of filas) {
    for (const link of fila.links) {
      if (!porSlug.has(link.slug)) porSlug.set(link.slug, { slug: link.slug, name: link.name });
    }
  }
  return [...porSlug.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** Nombre de cada negocio por slug, para leer los permisos acotados. */
export function nombresPorSlug(filas: CollaboratorItem[]): Record<string, string> {
  return Object.fromEntries(negociosDeFilas(filas).map((n) => [n.slug, n.name]));
}

/** Filas vinculadas al negocio (`""` = todas). */
export function filtrarPorNegocio(filas: CollaboratorItem[], slug: string): CollaboratorItem[] {
  if (!slug) return filas;
  return filas.filter((fila) => fila.links.some((link) => link.slug === slug));
}

/**
 * ¿La sesión puede actuar sobre esta cuenta? El master, sobre todas. Un dueño (o un tester,
 * que en Colaboradores actúa como dueño) no toca las cuentas de plataforma ni a los otros
 * dueños del negocio: la API lo rechazaría, así que las acciones no se muestran.
 */
export function puedeActuarSobre(fila: CollaboratorItem, esMaster: boolean): boolean {
  if (esMaster) return true;
  if (fila.is_platform_master || ROLES_DE_PLATAFORMA.has(fila.role)) return false;
  if (fila.is_self) return true;
  const esDueno = fila.role === "owner" || fila.links.some((link) => link.role === "owner");
  return !esDueno;
}

/** Secciones que se pueden otorgar o revocar desde esta sesión, ordenadas. */
export function seccionesOtorgables(permisos: Me["permissions"] | null | undefined, esMaster: boolean): string[] {
  return Object.keys(permisos ?? {})
    .filter((seccion) => permisos?.[seccion] && (esMaster || !NO_OTORGABLES_POR_EL_DUENO.has(seccion)))
    .sort();
}

/** Aviso tras el alta según lo que hizo la API (`resultado` de `POST /admin/collaborators`). */
export function mensajeDeAlta(resultado: string | undefined): string {
  if (resultado === "invitado") return "Ese correo ya tiene cuenta: se le envió una invitación al negocio.";
  return "Cuenta creada. Ya puede entrar al panel con la contraseña que definiste.";
}
