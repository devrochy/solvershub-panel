/**
 * Aliados (proveedores) del pack de Comercio (HU-CRM-03). Opcionales: el master los enciende
 * por negocio y el panel solo los muestra si `GET /pack/commerce/modulos` dice `aliados: true`.
 *
 * Tipos locales hasta regenerar `schema.d.ts` con el openapi de develop (el check `api-types`
 * compara contra develop, y el backend de esta HU todavía no está mergeado).
 */

export type ContactoAliado = {
  contacto?: string | null;
  telefono?: string | null;
  email?: string | null;
  notas?: string | null;
};

export type Aliado = {
  id: string;
  name: string;
  contact_info: ContactoAliado;
  active: boolean;
  products: number;
  created_at?: string | null;
};

export type ModulosComercio = { aliados: boolean };

export type EstadoAliados = { habilitado: boolean; por?: string | null; en?: string | null };

/** Valor del filtro «Sin aliado» en `?aliado=` (la API lo recibe como `ally_id=none`). */
export const SIN_ALIADO = "none";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** El filtro de la URL, validado: un id, `none` o nada (cualquier otra cosa se ignora). */
export function filtroDeAliado(valor: string | string[] | undefined): string | null {
  const v = Array.isArray(valor) ? valor[0] : valor;
  if (!v) return null;
  return v === SIN_ALIADO || UUID.test(v) ? v : null;
}

/** Nombre del aliado de un producto para la tabla. */
export function nombreDelAliado(allyId: string | null | undefined, aliados: Pick<Aliado, "id" | "name">[]): string {
  if (!allyId) return "Sin aliado";
  return aliados.find((a) => a.id === allyId)?.name ?? "Aliado eliminado";
}

/** Contacto guardable: recorta y quita los campos vacíos. */
export function contactoDelFormulario(data: FormData): ContactoAliado {
  const contacto: ContactoAliado = {};
  for (const campo of ["contacto", "telefono", "email", "notas"] as const) {
    const valor = String(data.get(campo) ?? "").trim();
    if (valor) contacto[campo] = valor;
  }
  return contacto;
}

/** Contacto en una línea para la tabla. */
export function contactoEnUnaLinea(c: ContactoAliado | null | undefined): string {
  if (!c) return "—";
  const partes = [c.contacto, c.telefono, c.email].filter((p): p is string => Boolean(p && p.trim()));
  return partes.length ? partes.join(" · ") : "—";
}

/** Mensaje del import CSV con los nombres de aliado que no existen. */
export function resumenDelImport(creados: number, desconocidos: string[] | undefined): string {
  const base = `Importados ${creados} productos.`;
  if (!desconocidos || desconocidos.length === 0) return base;
  return `${base} Sin aliado porque no existen: ${desconocidos.join(", ")}.`;
}
