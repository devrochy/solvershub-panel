"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, X } from "lucide-react";

import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/button";
import { RUTA_MEJORAR_PLAN, avisoDePlanFree } from "@/lib/plan-limite";
import { cn } from "@/lib/utils";

/**
 * Recordatorio de plan Free (HU-BILL-15): vive en todas las pantallas del panel mientras el
 * negocio no tenga un plan pago. El cierre es temporal: al cambiar de sección o recargar vuelve
 * a aparecer, también en Plan y consumo. No bloquea nada: el enforcement de cuotas y el estado
 * de la suscripción siguen siendo la única puerta real.
 */
export function AvisoPlanFree() {
  const pathname = usePathname();
  const shell = useShell();
  const reiniciar = shell?.reiniciarAvisoPlan;

  // Cada navegación devuelve el aviso: el cierre solo dura la vista actual.
  useEffect(() => {
    reiniciar?.();
  }, [pathname, reiniciar]);

  const aviso = avisoDePlanFree(shell?.plan);
  if (!shell || !aviso || shell.avisoPlanCerrado) return null;
  // Solo quien puede contratar el plan: owner/master o colaborador con escritura en `plan`.
  if (shell.esMaster || shell.permisos?.plan !== "write") return null;

  const peligro = aviso.tono === "danger";

  return (
    <div
      role={peligro ? "alert" : "status"}
      className={cn(
        "relative mb-6 rounded-lg border p-4 pr-12 sm:flex sm:items-center sm:gap-4",
        peligro
          ? "border-status-danger-border bg-status-danger-bg"
          : "border-status-warning-border bg-status-warning-bg",
      )}
    >
      <div className="flex items-start gap-3 sm:min-w-0 sm:flex-1">
        <Sparkles
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0",
            peligro ? "text-status-danger-fg" : "text-status-warning-fg",
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-headline">{aviso.titulo}</p>
          <p className="text-sm text-body">{aviso.texto}</p>
        </div>
      </div>
      <div className="mt-3 sm:mt-0">
        <Button asChild size="sm" variant="accent" className="w-full sm:w-auto">
          <Link href={RUTA_MEJORAR_PLAN}>{aviso.cta}</Link>
        </Button>
      </div>
      <button
        type="button"
        aria-label="Cerrar el aviso de plan"
        className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md text-text-soft transition-colors hover:bg-hover hover:text-headline focus-visible:outline-2 focus-visible:outline-focus"
        onClick={shell.cerrarAvisoPlan}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
