/**
 * La vista que cada quien prefiere en una lista con dos formas de verse (lista o vitrina, lista o
 * por etapa). Se recuerda en una cookie de este navegador: la página la usa cuando la URL no trae
 * `vista`, y los enlaces solo la escriben cuando difiere de la guardada.
 */

export const VISTAS = {
  productos: { cookie: "panel_vista_productos", opciones: ["lista", "vitrina"], porDefecto: "lista" },
  categorias: { cookie: "panel_vista_categorias", opciones: ["lista", "vitrina"], porDefecto: "lista" },
  pedidos: { cookie: "panel_vista_pedidos", opciones: ["lista", "etapas"], porDefecto: "lista" },
} as const;

export type ListaConVista = keyof typeof VISTAS;

/** Una vista válida de la lista, o `""`. */
export function vistaValida(lista: ListaConVista, valor: string | undefined | null): string {
  return valor && (VISTAS[lista].opciones as readonly string[]).includes(valor) ? valor : "";
}

/** La vista que se pinta: la de la URL, si no la guardada, si no la de siempre. */
export function vistaElegida(lista: ListaConVista, deLaUrl: string | undefined, guardada: string | undefined): string {
  return vistaValida(lista, deLaUrl) || vistaValida(lista, guardada) || VISTAS[lista].porDefecto;
}

/** Lo que va en `?vista=` de un enlace: nada si coincide con la que ya está guardada. */
export function vistaEnEnlace(lista: ListaConVista, vista: string, guardada: string | undefined): string {
  return vista === (vistaValida(lista, guardada) || VISTAS[lista].porDefecto) ? "" : vista;
}

export function cookieDeVista(lista: ListaConVista, vista: string): string {
  return `${VISTAS[lista].cookie}=${vista}; path=/; max-age=31536000; samesite=lax`;
}
