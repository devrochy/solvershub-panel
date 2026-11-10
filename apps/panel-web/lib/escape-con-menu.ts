/**
 * Escape con un menú abierto dentro de un cajón o diálogo cierra solo el menú. Los menús y los
 * diálogos de Radix vienen de dos versiones de `react-dismissable-layer` y no se ven como capas
 * de la misma pila: el diálogo se cerraba con ese Escape. El diálogo lo ignora y les pide a los
 * menús abiertos que se cierren (el `DropdownMenu` del kit escucha `CERRAR_MENUS`).
 */
export const CERRAR_MENUS = "sh:cerrar-menus";

export function escapeConMenuAbierto(evento: KeyboardEvent) {
  if (!document.querySelector('[role="menu"][data-state="open"]')) return;
  evento.preventDefault();
  window.dispatchEvent(new Event(CERRAR_MENUS));
}
