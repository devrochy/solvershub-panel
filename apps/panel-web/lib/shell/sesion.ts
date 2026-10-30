import { NAV_GROUPS, type NavGroupDef, type NavItem } from "@/components/shell/nav";
import type { Me } from "@/lib/api/types";
import { gruposVisibles, hojaDe, rutasDelMenu, type Permisos } from "@/lib/shell/navegacion";

/**
 * Sesión vigente del shell (P0 de pruebas, ciclo 2026-10-13): los permisos y el negocio
 * activo salen de `/admin/me` en cada carga, nunca de un snapshot guardado. Lógica pura;
 * las piezas del cliente (`VigilanteDeSesion`, `GuardiaDeSeccion`) solo la usan.
 */

/** Lo que el panel compara entre lo que renderizó y lo que la API dice ahora. */
export type SesionVigente = Pick<Me, "role" | "permissions" | "tenant">;

/** Lo que el shell renderizó: permisos, rol y negocio del `/admin/me` de ese render. */
export type SesionRenderizada = {
  permisos: Permisos;
  esMaster: boolean;
  negocioId: string | null;
};

function firmaDePermisos(permisos: Permisos): string {
  return JSON.stringify(
    Object.entries(permisos ?? {})
      .filter(([, acceso]) => acceso)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}

/**
 * ¿La API dice algo distinto de lo que el shell tiene en pantalla? Cambió una sección
 * (otorgada o revocada), el rol, o el negocio activo (otra pestaña lo cambió, o se
 * desvinculó): entonces hay que volver a pedir la vista al servidor.
 */
export function cambioLaSesion(renderizada: SesionRenderizada, vigente: SesionVigente): boolean {
  if ((vigente.role === "master") !== renderizada.esMaster) return true;
  if ((vigente.tenant?.id ?? null) !== renderizada.negocioId) return true;
  return firmaDePermisos(vigente.permissions) !== firmaDePermisos(renderizada.permisos);
}

/**
 * Página del menú (entrada o pestaña) a la que pertenece una ruta, sin mirar permisos: la
 * más específica (como `itemActivo`). `null` si la ruta no es de ninguna sección (por ejemplo el catálogo).
 */
export function itemDeRuta(pathname: string, grupos: NavGroupDef[] = NAV_GROUPS): NavItem | null {
  let mejor: NavItem | null = null;
  for (const ruta of rutasDelMenu(grupos)) {
    const item = hojaDe(ruta);
    const coincide = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (coincide && item.href.length > (mejor?.href.length ?? 0)) mejor = item;
  }
  return mejor;
}

/**
 * Rutas que ya no están en el menú (se llega desde la ficha de una conexión Meta) pero siguen
 * necesitando su clave de RBAC. Sin esto, `puedeVerRuta` las dejaría pasar a cualquier sesión.
 */
const SECCION_FUERA_DEL_MENU: Record<string, string> = {
  "/plantillas": "connections",
  // Plantillas con opciones (SPEC-40): se llega desde las plantillas de la conexión, como las de eventos.
  "/plantillas-opciones": "connections",
};

/**
 * Rutas que se movieron de sitio y solo redirigen (Dispositivos y Alertas de acceso pasaron de
 * Cobranza a Seguridad, ADR-0174). Se dejan pasar: la página nueva decide con su propia clave.
 * Sin esto, `/cobranza/*` las trataría como Resumen de Cobranza y quien no tiene Cobranza vería un
 * «sin acceso» en vez de llegar a Seguridad. Se quitan junto con los redirects.
 */
const RUTAS_MOVIDAS = new Set(["/cobranza/dispositivos", "/cobranza/alertas"]);

function seccionFueraDelMenu(pathname: string): string | null {
  const match = Object.entries(SECCION_FUERA_DEL_MENU)
    .filter(([ruta]) => pathname === ruta || pathname.startsWith(`${ruta}/`))
    .sort(([a], [b]) => b.length - a.length)[0];
  return match?.[1] ?? null;
}

/**
 * ¿La sesión puede ver la página de esta ruta? Misma regla que el menú (la clave `section`
 * es la del RBAC del core, ADR-0047): presencia del permiso y, si el ítem es `soloMaster`,
 * ser master. Una ruta fuera del menú siempre se puede ver: su página decide.
 */
export function puedeVerRuta(pathname: string, sesion: SesionRenderizada, grupos: NavGroupDef[] = NAV_GROUPS): boolean {
  if (RUTAS_MOVIDAS.has(pathname)) return true;
  const item = itemDeRuta(pathname, grupos);
  if (item) {
    if (!sesion.permisos?.[item.section]) return false;
    return !item.soloMaster || sesion.esMaster;
  }
  const seccion = seccionFueraDelMenu(pathname);
  if (seccion) return Boolean(sesion.permisos?.[seccion]);
  return true;
}

/** Primera sección visible del menú: a dónde mandar a quien no puede ver la actual. */
export function primeraSeccionVisible(sesion: SesionRenderizada, grupos: NavGroupDef[] = NAV_GROUPS): NavItem | null {
  for (const { visible } of gruposVisibles(sesion.permisos, grupos, sesion.esMaster)) {
    const lista = visible.find((item) => item.ready);
    if (lista) return lista;
  }
  return null;
}

/**
 * Clave con la que el layout monta la vista del negocio activo: al cambiar de negocio
 * cambia la clave, React desmonta la vista anterior y los formularios del cliente (que
 * arrancan con `useState` desde los datos del servidor) vuelven a nacer con los del negocio
 * nuevo, sin recargar la página.
 */
export function claveDeNegocio(me: Pick<Me, "tenant">): string {
  return me.tenant?.id ?? "sin-negocio";
}
