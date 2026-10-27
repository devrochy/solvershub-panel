import { AlertCircle, AlertTriangle } from "lucide-react";

import type { OpcionesHallazgo } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Hallazgos del lint junto al campo al que apuntan su `path` (HU-OPC-06). El error lleva ícono y
 * texto («Error:» solo para lector de pantalla): el rojo nunca va solo.
 */
export function MensajesDeCampo({
  hallazgos,
  id,
  className,
}: {
  hallazgos: readonly OpcionesHallazgo[];
  /** Para `aria-describedby` del control. */
  id?: string;
  className?: string;
}) {
  if (hallazgos.length === 0) return null;
  return (
    <ul id={id} className={cn("flex flex-col gap-1", className)}>
      {hallazgos.map((h, i) => {
        const error = h.severity === "error";
        const Icono = error ? AlertCircle : AlertTriangle;
        return (
          <li
            key={`${h.path}-${h.code}-${i}`}
            data-path={h.path}
            className={cn("flex items-start gap-1 text-xs", error ? "text-status-danger-fg" : "text-status-warning-fg")}
          >
            <Icono className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              <span className="sr-only">{error ? "Error: " : "Aviso: "}</span>
              {h.mensaje}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
