import { NAV_GROUPS, type NavGroupDef, type NavItem } from "@/components/shell/nav";

/** Permisos por sección de `/admin/me` (ADR-0047): presencia = puede ver. */
export type Permisos = Record<string, unknown> | null | undefined;

export type GrupoVisible = { group: NavGroupDef; visible: NavItem[] };

export type Miga = { label: string; href?: string };

/** Una página del menú: una entrada sin pestañas, o una pestaña de una entrada. */
export type RutaDelMenu = { group: NavGroupDef; entrada: NavItem; tab: NavItem | null };

/** El ítem (entrada o pestaña) que lleva a una página. */
export function hojaDe(ruta: RutaDelMenu): NavItem {
  return ruta.tab ?? ruta.entrada;
}

/**
 * Todas las páginas del menú (HU-UX-02): cada entrada sin pestañas y cada pestaña. Sesión,
 * paleta y avisos de pack leen de aquí, así ninguna ruta deja de estar protegida por haber
 * pasado de entrada a pestaña.
 */
export function rutasDelMenu(grupos: NavGroupDef[] = NAV_GROUPS): RutaDelMenu[] {
  return grupos.flatMap((group) =>
    group.items.flatMap((entrada): RutaDelMenu[] =>
      entrada.tabs?.length
        ? entrada.tabs.map((tab) => ({ group, entrada, tab }))
        : [{ group, entrada, tab: null }],
    ),
  );
}

function puedeVer(item: NavItem, permisos: Permisos, esMaster: boolean): boolean {
  return Boolean(permisos?.[item.section]) && (!item.soloMaster || esMaster);
}

/**
 * Grupos del menú con las entradas que el usuario puede ver (sin grupos vacíos). Un ítem
 * `soloMaster` exige además ser el admin de plataforma (`esMaster`), no solo el permiso.
 * Una entrada con pestañas se ve si se ve alguna; queda solo con las visibles y su `href`
 * pasa a ser el de la primera.
 */
export function gruposVisibles(
  permisos: Permisos,
  grupos: NavGroupDef[] = NAV_GROUPS,
  esMaster = false,
): GrupoVisible[] {
  return grupos
    .map((group) => ({
      group,
      visible: group.items.flatMap((item): NavItem[] => {
        if (!item.tabs?.length) return puedeVer(item, permisos, esMaster) ? [item] : [];
        const tabs = item.tabs.filter((tab) => puedeVer(tab, permisos, esMaster));
        return tabs.length ? [{ ...item, tabs, href: tabs[0].href }] : [];
      }),
    }))
    .filter(({ visible }) => visible.length > 0);
}

function coincide(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Página del menú de la ruta actual: la más específica (así `/cobranza/carteras/7` marca
 * Cobranza › Carteras y no el Resumen de `/cobranza`; `/conexiones/requisitos` marca
 * Conexiones › Requisitos y no la lista de Conexiones). `item` es la entrada del menú.
 */
export function itemActivo(
  pathname: string,
  grupos: GrupoVisible[],
): { group: NavGroupDef; item: NavItem; tab: NavItem | null } | null {
  let mejor: RutaDelMenu | null = null;
  for (const ruta of rutasDelMenu(grupos.map(({ group, visible }) => ({ ...group, items: visible })))) {
    const hoja = hojaDe(ruta);
    if (hoja.ready && coincide(pathname, hoja.href) && hoja.href.length > (mejor ? hojaDe(mejor).href.length : 0)) {
      mejor = ruta;
    }
  }
  if (!mejor) return null;
  const group = grupos.find((g) => g.group.id === mejor.group.id)?.group ?? mejor.group;
  return { group, item: mejor.entrada, tab: mejor.tab };
}

/**
 * Migas de la página (HU-DS-04): grupo › entrada › pestaña y, si la página está más
 * adentro (un detalle), su título como último nivel. El grupo no enlaza: no es una página.
 */
export function migasPara(pathname: string, grupos: GrupoVisible[], tituloPagina?: string): Miga[] {
  const activo = itemActivo(pathname, grupos);
  if (!activo) return [];
  const { group, item, tab } = activo;
  const hoja = tab ?? item;
  const enDetalle = pathname !== hoja.href;
  const migas: Miga[] = [{ label: group.label }];
  if (tab) {
    const enPortada = !enDetalle && tab.href === item.href;
    migas.push(enPortada ? { label: item.label } : { label: item.label, href: item.href });
  }
  migas.push(enDetalle ? { label: hoja.label, href: hoja.href } : { label: hoja.label });
  if (enDetalle && tituloPagina && tituloPagina !== hoja.label) migas.push({ label: tituloPagina });
  return migas;
}

export type Pestana = { href: string; label: string };

/**
 * Pestañas de la entrada actual (HU-UX-02). Si la entrada tiene subgrupos (Cobranza:
 * Operación, Monitoreo, Seguridad), `subgrupos` lleva a la primera pestaña de cada uno
 * (`subgrupoActual` es la del subgrupo de la página) y `pestanas` son las del subgrupo actual. Cada fila solo se muestra si tiene más de una.
 */
export function pestanasPara(
  pathname: string,
  grupos: GrupoVisible[],
): { subgrupos: Pestana[]; subgrupoActual: string | null; pestanas: Pestana[] } {
  const vacio = { subgrupos: [], subgrupoActual: null, pestanas: [] };
  const activo = itemActivo(pathname, grupos);
  if (!activo?.tab || !activo.item.tabs) return vacio;
  const tabs = activo.item.tabs.filter((tab) => tab.ready);
  const subs = [...new Set(tabs.map((tab) => tab.sub))];
  const subgrupos =
    subs.length > 1
      ? subs.map((sub) => {
          const primera = tabs.find((tab) => tab.sub === sub)!;
          return { href: primera.href, label: sub ?? activo.item.label };
        })
      : [];
  const hermanas = tabs.filter((tab) => tab.sub === activo.tab!.sub);
  return {
    subgrupos,
    subgrupoActual: subgrupos.length ? (hermanas[0]?.href ?? null) : null,
    pestanas: hermanas.length > 1 ? hermanas.map((tab) => ({ href: tab.href, label: tab.label })) : [],
  };
}
