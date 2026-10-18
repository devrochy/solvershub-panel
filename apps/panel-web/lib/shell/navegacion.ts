import { NAV_GROUPS, type NavGroupDef, type NavItem } from "@/components/shell/nav";

/** Permisos por sección de `/admin/me` (ADR-0047): presencia = puede ver. */
export type Permisos = Record<string, unknown> | null | undefined;

export type GrupoVisible = { group: NavGroupDef; visible: NavItem[] };

export type Miga = { label: string; href?: string };

/**
 * Grupos del menú con los ítems que el usuario puede ver (sin grupos vacíos). Un ítem
 * `soloMaster` exige además ser el admin de plataforma (`esMaster`), no solo el permiso.
 */
export function gruposVisibles(
  permisos: Permisos,
  grupos: NavGroupDef[] = NAV_GROUPS,
  esMaster = false,
): GrupoVisible[] {
  return grupos
    .map((group) => ({
      group,
      visible: group.items.filter((item) => permisos?.[item.section] && (!item.soloMaster || esMaster)),
    }))
    .filter(({ visible }) => visible.length > 0);
}

function coincide(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Ítem del menú de la página actual: el más específico (así `/cobranza/carteras/7` marca
 * Carteras y no el Resumen de `/cobranza`; `/conexiones/requisitos` marca Requisitos y no
 * Conexiones).
 */
export function itemActivo(pathname: string, grupos: GrupoVisible[]): { group: NavGroupDef; item: NavItem } | null {
  let mejor: { group: NavGroupDef; item: NavItem } | null = null;
  for (const { group, visible } of grupos) {
    for (const item of visible) {
      if (item.ready && coincide(pathname, item.href) && item.href.length > (mejor?.item.href.length ?? 0)) {
        mejor = { group, item };
      }
    }
  }
  return mejor;
}

/**
 * Migas de la página (HU-DS-04): grupo › sección y, si la página está más adentro que la
 * sección (un detalle), su título como último nivel. El grupo no enlaza: no es una página.
 */
export function migasPara(pathname: string, grupos: GrupoVisible[], tituloPagina?: string): Miga[] {
  const activo = itemActivo(pathname, grupos);
  if (!activo) return [];
  const { group, item } = activo;
  const enDetalle = pathname !== item.href;
  const migas: Miga[] = [{ label: group.label }];
  migas.push(enDetalle ? { label: item.label, href: item.href } : { label: item.label });
  if (enDetalle && tituloPagina && tituloPagina !== item.label) migas.push({ label: tituloPagina });
  return migas;
}

/**
 * Pestañas de sección (HU-DS-04): las hermanas de la sección actual dentro de un pack
 * (y de la misma subsección, si el pack las tiene). Solo si hay más de una.
 */
export function pestanasPara(pathname: string, grupos: GrupoVisible[]): { href: string; label: string }[] {
  const activo = itemActivo(pathname, grupos);
  if (!activo?.group.pack) return [];
  const visibles = grupos.find((g) => g.group.id === activo.group.id)?.visible ?? [];
  const hermanas = visibles.filter((item) => item.ready && item.sub === activo.item.sub);
  return hermanas.length > 1 ? hermanas.map((item) => ({ href: item.href, label: item.label })) : [];
}
