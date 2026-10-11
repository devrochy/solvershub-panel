"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";

/**
 * Aviso del asistente pausado (HU-UI-03). Mientras está activo no muestra nada (sin
 * ruido); pausado, lo dice y, si el usuario escribe en Configuración, ofrece reactivarlo.
 *
 * `compacto` va dentro de la barra superior en escritorio; `franja` va debajo de ella
 * en celular, donde una fila de 375 px no alcanza para el negocio, el aviso y el botón.
 */
export function EstadoAsistente({
  pausado,
  puedeReactivar,
  variante = "compacto",
  className,
}: {
  pausado: boolean;
  puedeReactivar: boolean;
  variante?: "compacto" | "franja";
  className?: string;
}) {
  const { run, pending } = useAction();

  if (!pausado) return null;

  const reactivar = puedeReactivar && (
    <Button
      size="sm"
      variant="outline"
      loading={pending}
      onClick={() =>
        void run(async () => {
          const res = await fetch("/api/settings/asistente", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pausado: false }),
          });
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          return res.ok
            ? { ok: true, success: "El asistente volvió a responder." }
            : { ok: false, error: json.error ?? "No se pudo reactivar el asistente." };
        })
      }
    >
      Reactivar
    </Button>
  );

  if (variante === "franja") {
    return (
      <div
        role="status"
        className={cn(
          "flex items-center justify-between gap-3 border-b border-status-warning-border bg-status-warning-bg px-4 py-2",
          className,
        )}
      >
        <Badge variant="warning">El asistente está pausado</Badge>
        {reactivar}
      </div>
    );
  }

  return (
    <div role="status" className={cn("flex items-center gap-2", className)}>
      <Badge variant="warning">Asistente pausado</Badge>
      {reactivar}
    </div>
  );
}
