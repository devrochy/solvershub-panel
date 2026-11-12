"use client";

import Link from "next/link";
import { Sparkles, X } from "lucide-react";

import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/button";
import { RUTA_MEJORAR_PLAN, avisoDePlanFree } from "@/lib/plan-limite";
import { cn } from "@/lib/utils";

/**
 * Recordatorio permanente de plan Free (HU-BILL-15): vive en todas las pantallas del panel
 * mientras el negocio no tenga un plan pago. Se cierra por sesión (cookie) y no bloquea nada:
 * el enforcement de cuotas y el estado de la suscripción siguen siendo la única puerta real.
 */
export function AvisoPlanFree() {
  const shell = useShell();
  const aviso = avisoDePlanFree(shell?.plan);
  if (!shell || !aviso || shell.avisoPlanCerrado) return null;
  // Solo quien puede contratar el plan: owner/master o colaborador con escritura en `plan`.
  if (shell.esMaster || shell.permisos?.plan !== "write") return null;

  const peligro = aviso.tono === "danger";

  return (
    <div
      role={peligro ? "alert" : "status"}
      className={cn(
        "mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border p-4",
        peligro
          ? "border-status-danger-border bg-status-danger-bg"
          : "border-status-warning-border bg-status-warning-bg",
      )}
    >
      <Sparkles
        className={cn(
          "h-5 w-5 shrink-0",
          peligro ? "text-status-danger-fg" : "text-status-warning-fg",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-headline">{aviso.titulo}</p>
        <p className="text-sm text-body">{aviso.texto}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="accent">
          <Link href={RUTA_MEJORAR_PLAN}>{aviso.cta}</Link>
        </Button>
        <button
          type="button"
          aria-label="Cerrar el aviso de plan"
          className="rounded p-1 text-text-soft transition-colors hover:text-headline focus-visible:outline-2 focus-visible:outline-focus"
          onClick={shell.cerrarAvisoPlan}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
