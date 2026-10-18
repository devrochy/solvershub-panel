"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { toast } from "@/lib/toast-store";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
  /** Estado HTTP del BFF, si se conoce: con 401 la sesión ya no vale y se vuelve a /login. */
  status?: number;
}

export interface UseActionOptions {
  /** Refresca la vista del servidor (router.refresh) tras el éxito. Default true. */
  refresh?: boolean;
  /** Reversa del estado optimista si la acción falla. */
  rollback?: () => void;
}

export const MENSAJE_SESION_TERMINADA = "Tu sesión terminó. Vuelve a iniciar sesión.";

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
          rollback?.();
          if (result.status === 401) {
            // Cuenta desactivada o sesión invalidada: se cierra la sesión del navegador.
            toast.error(MENSAJE_SESION_TERMINADA);
            await fetch("/api/session", { method: "DELETE" }).catch(() => {});
            router.replace("/login");
            return false;
          }
          // `error` llega de un JSON: si no es texto (p. ej. `{code, message}`), renderizarlo
          // tumbaría la página (React #31).
          const error: unknown = result.error;
          toast.error(typeof error === "string" && error ? error : "Algo salió mal. Inténtalo de nuevo.");
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
