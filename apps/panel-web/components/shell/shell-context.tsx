"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Permisos } from "@/lib/shell/navegacion";
import type { PacksDelNegocio } from "@/lib/shell/paleta";

type Shell = {
  permisos: Permisos;
  /** Packs del negocio (ADR-0019): la paleta omite los apagados. */
  packs: PacksDelNegocio;
  asistentePausado: boolean;
  /** Escritura en Configuración: puede pausar o reactivar el asistente. */
  puedeEditarAsistente: boolean;
};

/**
 * Datos del shell que necesitan las piezas del cliente fuera del menú (migas y pestañas
 * del `PageHeader`, HU-DS-04; paleta de comandos, HU-DS-05). Sin proveedor (tests,
 * catálogo) no hay migas, pestañas ni secciones en la paleta.
 */
const ShellContext = createContext<Shell | null>(null);

export function ShellProvider({
  permisos,
  packs = {},
  asistentePausado = false,
  puedeEditarAsistente = false,
  children,
}: Partial<Omit<Shell, "permisos">> & { permisos: Permisos; children: ReactNode }) {
  return (
    <ShellContext.Provider value={{ permisos, packs, asistentePausado, puedeEditarAsistente }}>
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  return useContext(ShellContext);
}
