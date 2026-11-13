"use client";

import Link from "next/link";
import { Sparkles, X } from "lucide-react";

import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/button";
import { RUTA_MEJORAR_PLAN, avisoDePlanFree } from "@/lib/plan-limite";
import { cn } from "@/lib/utils";

/**
 * Tarjeta fija del plan Free dentro de la campana (HU-BILL-15). No es una notificación
 * persistida: se deriva del plan para que el recordatorio siga apareciendo aunque el dueño
 * marque todo como leído. Se cierra con el mismo estado de sesión que el banner.
 */
export function TarjetaPlanFree({ onCerrar }: { onCerrar: () => void }) {
  const shell = useShell();
  const aviso = avisoDePlanFree(shell?.plan);
  if (!shell || !aviso || shell.avisoPlanCerrado) return null;
  if (shell.esMaster || shell.permisos?.plan !== "write") return null;

  const peligro = aviso.tono === "danger";

  return (
    <div
      className={cn(
        "m-2 mb-0 rounded-md border p-3",
        peligro
          ? "border-status-danger-border bg-status-danger-bg"
          : "border-status-warning-border bg-status-warning-bg",
      )}
    >
      <div className="flex items-start gap-2">
        <Sparkles
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0",
            peligro ? "text-status-danger-fg" : "text-status-warning-fg",
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-headline">{aviso.titulo}</p>
          <p className="text-xs text-body">{aviso.texto}</p>
        </div>
        <button
          type="button"
          aria-label="Cerrar el aviso de plan"
          className="rounded p-1 text-text-soft transition-colors hover:text-headline focus-visible:outline-2 focus-visible:outline-focus"
          onClick={shell.cerrarAvisoPlan}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="mt-2">
        <Button asChild size="sm" variant="outline">
          <Link href={RUTA_MEJORAR_PLAN} onClick={onCerrar}>
            {aviso.cta}
          </Link>
        </Button>
      </div>
    </div>
  );
}
