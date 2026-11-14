"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import type { MePlanSummary } from "@/lib/api/types";
import type { Permisos } from "@/lib/shell/navegacion";
import type { EstadoModulo } from "@/lib/shell/modulos";
import type { PacksDelNegocio } from "@/lib/shell/paleta";

type Shell = {
  permisos: Permisos;
  /** Admin de plataforma (`role === "master"`): ve los ítems `soloMaster` del menú. */
  esMaster: boolean;
  /** Negocio activo con el que se renderizó el shell (`null` = cuenta sin negocio). */
  negocioId: string | null;
  /** Packs del negocio (ADR-0019): la paleta omite los apagados. */
  packs: PacksDelNegocio;
  /** Módulos del negocio: habilitado (agente publicado), plan o pack apagado. */
  modulos: Record<string, EstadoModulo>;
  asistentePausado: boolean;
  /** Escritura en Configuración: puede pausar o reactivar el asistente. */
  puedeEditarAsistente: boolean;
  /** Plan del negocio activo (HU-BILL-15): banner y campana lo leen sin otra petición. */
  plan: MePlanSummary | null;
  /** El aviso de plan Free se cerró en la vista actual; reaparece al navegar o recargar. */
  avisoPlanCerrado: boolean;
  cerrarAvisoPlan: () => void;
  /** Vuelve a mostrar el aviso (cambio de sección o recarga). */
  reiniciarAvisoPlan: () => void;
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
  modulos = {},
  asistentePausado = false,
  puedeEditarAsistente = false,
  plan = null,
  children,
}: Partial<Omit<Shell, "permisos" | "avisoPlanCerrado" | "cerrarAvisoPlan" | "reiniciarAvisoPlan">> & {
  permisos: Permisos;
  children: ReactNode;
}) {
  const [avisoPlanCerrado, setAvisoPlanCerrado] = useState(false);
  const cerrarAvisoPlan = useCallback(() => setAvisoPlanCerrado(true), []);
  const reiniciarAvisoPlan = useCallback(() => setAvisoPlanCerrado(false), []);
  return (
    <ShellContext.Provider
      value={{
        permisos,
        esMaster,
        negocioId,
        packs,
        modulos,
        asistentePausado,
        puedeEditarAsistente,
        plan,
        avisoPlanCerrado,
        cerrarAvisoPlan,
        reiniciarAvisoPlan,
      }}
    >
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  return useContext(ShellContext);
}
