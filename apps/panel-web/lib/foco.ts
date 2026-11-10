import { useRef } from "react";

/**
 * A quién devolverle el foco cuando se cierre un diálogo que se está abriendo ahora. Si el foco
 * está en un ítem de menú, el ítem desaparece con el menú y Radix lo dejaría en `<body>`: se usa
 * el botón que abrió el menú (el contenido del menú lo nombra en `aria-labelledby`).
 */
export function focoParaDevolver(): HTMLElement | null {
  const activo = typeof document !== "undefined" ? document.activeElement : null;
  if (!(activo instanceof HTMLElement)) return null;
  const menu = activo.closest('[role="menu"]');
  const disparador = menu?.getAttribute("aria-labelledby");
  if (disparador) {
    const boton = document.getElementById(disparador);
    if (boton) return boton;
  }
  return activo === document.body ? null : activo;
}

/**
 * Para el contenido de un diálogo o panel abierto por código: al abrir guarda `focoParaDevolver()` y al
 * cerrar le devuelve el foco, salvo que quien lo usa ya lo haya movido (`preventDefault`).
 */
export function useFocoDevuelto(
  onOpenAutoFocus?: (evento: Event) => void,
  onCloseAutoFocus?: (evento: Event) => void,
) {
  const volverA = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus(evento: Event) {
      volverA.current = focoParaDevolver();
      onOpenAutoFocus?.(evento);
    },
    onCloseAutoFocus(evento: Event) {
      onCloseAutoFocus?.(evento);
      if (evento.defaultPrevented || !volverA.current?.isConnected) return;
      evento.preventDefault();
      volverA.current.focus();
    },
  };
}
