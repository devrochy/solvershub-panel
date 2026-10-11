"use client";

import { escalaX, escalaY, extension, pathArea, pathLinea, type Valor } from "@/components/dataviz/escalas";
import { useAncho } from "@/components/dataviz/internos";
import { cn } from "@/lib/utils";

/** Aire alrededor del trazo para que el punto final (r 4 + anillo de 2) no se corte. */
const AIRE = 6;

/**
 * Tendencia mínima sin ejes (HU-DS-06), pensada para la ranura `sparkline` de `KpiTile`.
 * Trazo de 2 px en el color de serie única y punto en el último valor. Sin `label` es
 * decorativa (`aria-hidden`: el valor ya está escrito al lado); con `label` va sola y se
 * anuncia como imagen con ese resumen (ver `resumenSerie`).
 */
export function Sparkline({
  values,
  label,
  area = false,
  height = 32,
  className,
}: {
  values: readonly Valor[];
  /** Resumen para lectores de pantalla cuando la sparkline va sin un valor escrito al lado. */
  label?: string;
  /** Lavado bajo la línea (10 %). */
  area?: boolean;
  height?: number;
  className?: string;
}) {
  const [ref, ancho] = useAncho<HTMLDivElement>(120);
  const n = values.length;
  const [min, max] = extension(values);
  const x = escalaX(n, [AIRE, ancho - AIRE]);
  // Una serie plana queda centrada en vez de pegada a un borde.
  const y = escalaY(min === max ? [min - 1, max + 1] : [min, max], [height - AIRE, AIRE]);
  let ultimo = -1;
  for (let i = n - 1; i >= 0 && ultimo < 0; i--) if (typeof values[i] === "number" && Number.isFinite(values[i])) ultimo = i;

  const accesible = label ? { role: "img", "aria-label": label } : { "aria-hidden": true as const };

  return (
    <div ref={ref} className={cn("w-full", className)}>
      <svg width="100%" height={height} viewBox={`0 0 ${ancho} ${height}`} focusable="false" className="block" {...accesible}>
        {area && <path d={pathArea(values, x, y, height - AIRE)} className="fill-data-single" fillOpacity={0.1} />}
        <path
          d={pathLinea(values, x, y)}
          fill="none"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="stroke-data-single"
        />
        {ultimo >= 0 && (
          <circle
            cx={x(ultimo)}
            cy={y(values[ultimo] as number)}
            r={4}
            strokeWidth={2}
            className="fill-data-single stroke-surface"
          />
        )}
      </svg>
    </div>
  );
}
