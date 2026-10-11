"use client";

import { createContext, useContext } from "react";

/** La sidebar y el botón de tema escuchan estos eventos (la paleta no conoce su estado). */
export const EVENTO_ALTERNAR_MENU = "panel:alternar-menu";
export const EVENTO_CAMBIAR_TEMA = "panel:cambiar-tema";

export type Atajos = {
  abrirPaleta: () => void;
  abrirAyuda: () => void;
  atajosActivos: boolean;
  cambiarAtajos: (activos: boolean) => void;
};

/** Lo provee `AtajosProvider` (HU-DS-05). Archivo aparte para que el kit no cargue la paleta. */
export const AtajosContext = createContext<Atajos | null>(null);

/** Sin proveedor (tests, catálogo) los atajos de una tecla siguen encendidos. */
export function useAtajos() {
  return useContext(AtajosContext);
}
