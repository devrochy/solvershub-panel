"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Permisos } from "@/lib/shell/navegacion";
import type { PacksDelNegocio } from "@/lib/shell/paleta";

type Shell = {
  permisos: Permisos;
  /** Admin de plataforma (`role === "master"`): ve los ítems `soloMaster` del menú. */
  esMaster: boolean;
  /** Negocio activo con el que se renderizó el shell (`null` = cuenta sin negocio). */
  negocioId: string | null;
  /** Packs del negocio (ADR-0019): la paleta omite los apagados. */
  packs: PacksDelNegocio;
  asistentePausado: boolean;
  /** Escritura en Configuración: puede pausar o reactivar el asistente. */
  puedeEditarAsistente: boolean;
};

/**
 * Datos del shell que necesitan las piezas del cliente fuera del menú (migas y pestañas
 * del `PageHeader`, HU-DS-04; paleta de comandos, HU-DS-05; guardia y vigilante de la
 * sesión). Salen del `/admin/me` de cada render del layout: no son un snapshot guardado.
 * Sin proveedor (tests, catálogo) no hay migas, pestañas ni secciones en la paleta.
 */
const ShellContext = createContext<Shell | null>(null);

export function ShellProvider({
  permisos,
  esMaster = false,
  negocioId = null,
  packs = {},
  asistentePausado = false,
  puedeEditarAsistente = false,
  children,
}: Partial<Omit<Shell, "permisos">> & { permisos: Permisos; children: ReactNode }) {
  return (
    <ShellContext.Provider
      value={{ permisos, esMaster, negocioId, packs, asistentePausado, puedeEditarAsistente }}
    >
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  return useContext(ShellContext);
}
