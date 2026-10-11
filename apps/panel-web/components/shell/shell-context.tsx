"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Permisos } from "@/lib/shell/navegacion";

/**
 * Datos del shell que necesitan las piezas del cliente fuera del menú (migas y pestañas
 * del `PageHeader`, HU-DS-04). Sin proveedor (tests, catálogo) no hay migas ni pestañas.
 */
const ShellContext = createContext<{ permisos: Permisos } | null>(null);

export function ShellProvider({ permisos, children }: { permisos: Permisos; children: ReactNode }) {
  return <ShellContext.Provider value={{ permisos }}>{children}</ShellContext.Provider>;
}

export function useShell() {
  return useContext(ShellContext);
}
