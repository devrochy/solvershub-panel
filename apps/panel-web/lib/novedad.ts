"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Avisos de producto de una sola vez (HU-AOS-80): «Nuevo: personaliza tu agente aquí». No es un
 * contador: se descarta y se recuerda por usuario y agente en este navegador. Si el navegador no
 * deja guardar (ventana privada), el aviso se da por visto para no insistir en cada visita.
 */

const EVENTO = "panel-novedad";

function almacen(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function claveDeNovedad(novedad: string, usuario: string, agente: string): string {
  return `panel_novedad_${novedad}:${usuario}:${agente}`;
}

export function novedadVista(clave: string): boolean {
  const s = almacen();
  if (!s) return true;
  try {
    return s.getItem(clave) === "1";
  } catch {
    return true;
  }
}

export function marcarNovedadVista(clave: string): void {
  const s = almacen();
  try {
    s?.setItem(clave, "1");
  } catch {
    // Sin almacenamiento el aviso ya se trata como visto.
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENTO, { detail: clave }));
}

function suscribir(aviso: () => void): () => void {
  window.addEventListener(EVENTO, aviso);
  window.addEventListener("storage", aviso);
  return () => {
    window.removeEventListener(EVENTO, aviso);
    window.removeEventListener("storage", aviso);
  };
}

/** `[pendiente, descartar]`. En el servidor se pinta como vista: sin avisos que salten al hidratar. */
export function useNovedad(clave: string): [boolean, () => void] {
  const vista = useSyncExternalStore(
    suscribir,
    () => novedadVista(clave),
    () => true,
  );
  const descartar = useCallback(() => marcarNovedadVista(clave), [clave]);
  return [!vista, descartar];
}
