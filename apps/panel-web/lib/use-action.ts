"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { toast } from "@/lib/toast-store";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

export interface UseActionOptions {
  /** Refresca la vista del servidor (router.refresh) tras el éxito. Default true. */
  refresh?: boolean;
  /** Reversa del estado optimista si la acción falla. */
  rollback?: () => void;
}

/**
 * Ciclo de acción del panel (HU-UI-02): ejecuta el fetch al BFF, muestra el
 * toast (éxito/error), refresca la vista y revierte lo optimista si falla.
 * Reemplaza los estados locales de carga/éxito/error de las páginas.
 */
export function useAction({ refresh = true, rollback }: UseActionOptions = {}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (action: () => Promise<ActionResult>): Promise<boolean> => {
      setPending(true);
      try {
        const result = await action();
        if (!result.ok) {
          toast.error(result.error ?? "Algo salió mal. Inténtalo de nuevo.");
          rollback?.();
          return false;
        }
        toast.success(result.success ?? "Listo.");
        if (refresh) router.refresh();
        return true;
      } catch {
        toast.error("No se pudo contactar el servidor.");
        rollback?.();
        return false;
      } finally {
        setPending(false);
      }
    },
    [refresh, rollback, router],
  );

  return { run, pending };
}
