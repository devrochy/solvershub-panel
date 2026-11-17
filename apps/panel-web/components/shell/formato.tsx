"use client";

import { useMemo } from "react";

import { useShell } from "@/components/shell/shell-context";
import {
  ZONA_POR_DEFECTO,
  formatFecha,
  formatFechaHora,
  formatFechaHoraTecnica,
  formatFechaLarga,
  formatHora,
  formatRelativo,
} from "@/lib/fechas";

/**
 * Formateo de fechas con la zona del negocio activo (ADR-0199), para componentes cliente.
 * Los componentes servidor usan las funciones de `lib/fechas` con la zona que reciben de
 * `me.timezone` o `getBusinessTimezone()`.
 */
export function useFormato() {
  const shell = useShell();
  const timeZone = shell?.timezone || ZONA_POR_DEFECTO;
  return useMemo(
    () => ({
      timeZone,
      fecha: (value: string | Date | null | undefined) => formatFecha(value, timeZone),
      fechaHora: (value: string | Date | null | undefined) => formatFechaHora(value, timeZone),
      fechaHoraTecnica: (value: string | Date | null | undefined) =>
        formatFechaHoraTecnica(value, timeZone),
      fechaLarga: (value: string | Date | null | undefined, conHora = false) =>
        formatFechaLarga(value, timeZone, conHora),
      hora: (value: string | Date | null | undefined) => formatHora(value, timeZone),
      relativo: (value: string | Date | null | undefined) => formatRelativo(value),
    }),
    [timeZone],
  );
}
