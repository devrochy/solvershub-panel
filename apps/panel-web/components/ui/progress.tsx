import { cn } from "@/lib/utils";

export type ProgressTone = "data" | "success" | "danger" | "warning" | "info" | "neutral";

export type ProgressSegment = { key: string; value: number; label: string; tone: ProgressTone };

const RELLENO: Record<ProgressTone, string> = {
  data: "bg-data-single",
  success: "bg-status-success-fg",
  danger: "bg-status-danger-fg",
  warning: "bg-status-warning-fg",
  info: "bg-status-info-fg",
  neutral: "bg-text-soft",
};

/**
 * Barra de avance lineal (HU-QA-03). Con `segments` reparte el total por estado (cada
 * segmento con 2 px de aire); sin ellos, una sola barra `data-single`. El texto accesible
 * dice el avance en palabras: el color nunca va solo (la leyenda la pone quien la usa).
 */
export function Progress({
  value,
  max = 100,
  segments,
  label,
  valueText,
  size = "md",
  className,
}: {
  /** Avance total (lo que cuenta como hecho), entre 0 y `max`. */
  value: number;
  max?: number;
  segments?: ProgressSegment[];
  /** Nombre accesible de la barra. */
  label: string;
  /** Texto que lee el lector de pantalla (por defecto «value de max»). */
  valueText?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const total = Math.max(max, 0);
  const acotado = Math.min(Math.max(value, 0), total);
  const ancho = (v: number) => (total > 0 ? `${(Math.max(v, 0) / total) * 100}%` : "0%");
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={acotado}
      aria-valuetext={valueText ?? `${acotado} de ${total}`}
      className={cn(
        "flex w-full gap-0.5 overflow-hidden rounded-full bg-hover",
        size === "sm" ? "h-1.5" : "h-2.5",
        className,
      )}
    >
      {segments ? (
        segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <span
              key={s.key}
              title={`${s.label}: ${s.value}`}
              className={cn("h-full first:rounded-l-full last:rounded-r-full", RELLENO[s.tone])}
              style={{ width: ancho(s.value) }}
            />
          ))
      ) : (
        <span className={cn("h-full rounded-full", RELLENO.data)} style={{ width: ancho(acotado) }} />
      )}
    </div>
  );
}
