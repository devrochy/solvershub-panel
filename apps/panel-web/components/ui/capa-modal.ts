/**
 * Posición común de los modales del panel respecto a la barra superior (64 px, `h-16`).
 *
 * En celular el modal arranca DEBAJO de la barra: así su botón de cerrar nunca queda sobre el
 * contenido del header (selector de negocio, campana) y la barra sigue a la vista. Si el contenido
 * es más alto que la pantalla, el modal se desplaza por dentro en vez de salirse por arriba.
 * Desde `md` el diálogo se centra en el área bajo la barra, con alto máximo para que tampoco se salga.
 */

/** Fondo oscuro: en celular empieza bajo la barra superior. */
export const fondoModal = "fixed inset-x-0 bottom-0 top-16 z-50 bg-overlay md:top-0";

/** Diálogo centrado (Dialog, Confirm, ayuda de atajos). */
export const posicionDialogo =
  "fixed left-1/2 top-[calc(4rem+0.75rem)] z-50 max-h-[calc(100dvh-4rem-1.5rem)] w-[calc(100%-1.5rem)] -translate-x-1/2 overflow-y-auto " +
  "md:top-[calc(50%+2rem)] md:max-h-[calc(100dvh-4rem-2rem)] md:w-full md:-translate-y-1/2";

/** Panel lateral (Sheet): en celular ocupa la pantalla bajo la barra superior. */
export const posicionPanelLateral = "fixed bottom-0 right-0 top-16 z-50 md:top-0";
