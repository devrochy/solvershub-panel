"use client";

import { createContext, useContext, type ReactNode } from "react";

const PestanasOpcionalesContext = createContext<readonly string[]>([]);

/**
 * Módulos opcionales encendidos en el negocio que muestran su pestaña (VEN-14): la sección los
 * consulta en su `layout.tsx` y las pestañas `oculta` con ese `mostrarCon` salen en la fila.
 */
export function PestanasOpcionales({ modulos, children }: { modulos: readonly string[]; children: ReactNode }) {
  return <PestanasOpcionalesContext.Provider value={modulos}>{children}</PestanasOpcionalesContext.Provider>;
}

export function usePestanasOpcionales(): readonly string[] {
  return useContext(PestanasOpcionalesContext);
}
