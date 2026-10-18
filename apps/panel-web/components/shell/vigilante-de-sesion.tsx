"use client";

import { useEffect, useEffectEvent } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useShell } from "@/components/shell/shell-context";
import type { Me } from "@/lib/api/types";
import { cambioLaSesion } from "@/lib/shell/sesion";
import { toast } from "@/lib/toast-store";

/**
 * Mantiene el shell con la sesión vigente (P0 de pruebas). Al navegar entre secciones el
 * layout compartido no se vuelve a renderizar, así que el menú y los permisos quedarían
 * como estaban al entrar. En cada cambio de ruta, y al volver a la pestaña, pregunta
 * `GET /api/session` (la sesión tal como la ve la API ahora):
 *
 * - 401 (cuenta desactivada, sesión invalidada) o 403 `tenant_suspended` (negocio
 *   suspendido): el BFF ya borró las cookies; se avisa y se va a /login.
 * - permisos, rol o negocio distintos de los renderizados: `router.refresh()` vuelve a
 *   pedir el layout y la página al servidor, y el menú y la guardia usan lo nuevo.
 * - cualquier otro fallo (red, 5xx): no hace nada; la vista sigue con lo que tenía.
 */
export function VigilanteDeSesion() {
  const pathname = usePathname();
  const router = useRouter();
  const shell = useShell();

  const revisar = useEffectEvent(async () => {
    if (!shell) return;
    let res: Response;
    try {
      res = await fetch("/api/session", { cache: "no-store" });
    } catch {
      return;
    }
    if (res.status === 401) {
      router.replace("/login");
      return;
    }
    if (res.status === 403) {
      const json = (await res.json().catch(() => null)) as { code?: string; error?: string } | null;
      if (json?.code === "tenant_suspended") {
        toast.error(json.error ?? "El negocio está suspendido. Tu sesión se cerró.");
        router.replace("/login");
      }
      return;
    }
    if (!res.ok) return;
    const vigente = (await res.json().catch(() => null)) as Me | null;
    if (!vigente) return;
    if (cambioLaSesion({ permisos: shell.permisos, esMaster: shell.esMaster, negocioId: shell.negocioId }, vigente)) {
      router.refresh();
    }
  });

  useEffect(() => {
    void revisar();
  }, [pathname]);

  useEffect(() => {
    function alVolver() {
      if (document.visibilityState === "visible") void revisar();
    }
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, []);

  return null;
}
