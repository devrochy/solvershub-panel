import { cn } from "@/lib/utils";

const numero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

/**
 * Tono del anillo según el porcentaje: el color de serie única mientras va bien; aviso desde
 * `warnAt` y peligro al pasarse del 100 %. Los colores de estado solo aparecen cuando
 * significan estado (DESIGN.md · Barra de progreso).
 */
export function tonoDeProgreso(porcentaje: number, warnAt = 80): "normal" | "aviso" | "exceso" {
  if (porcentaje > 100) return "exceso";
  if (porcentaje >= warnAt) return "aviso";
  return "normal";
}

const TRAZO = {
  normal: "stroke-data-single",
  aviso: "stroke-status-warning-fg",
  exceso: "stroke-status-danger-fg",
} as const;

/**
 * Anillo de progreso (HU-DS-06) para el consumo del plan: el porcentaje va escrito en el
 * centro (el color nunca es la única señal) y el riel es un paso más claro del mismo tono.
 * Expone `role="progressbar"` con el valor real en `aria-valuetext`.
 */
export function ProgressRing({
  value,
  max = 100,
  label,
  size = 72,
  warnAt = 80,
  caption,
  formatValue = (v: number) => numero.format(v),
  className,
}: {
  value: number;
  max?: number;
  /** Nombre accesible: «Conversaciones del plan». */
  label: string;
  /** Diámetro en píxeles. */
  size?: number;
  /** Porcentaje desde el que pasa a tono de aviso. */
  warnAt?: number;
  /** Texto bajo el anillo («1.240 de 2.000 conversaciones»). */
  caption?: string;
  formatValue?: (v: number) => string;
  className?: string;
}) {
  const porcentaje = max > 0 ? (value / max) * 100 : 0;
  const tono = tonoDeProgreso(porcentaje, warnAt);
  const grosor = size >= 96 ? 8 : 6;
  const radio = (size - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const lleno = (circunferencia * Math.min(Math.max(porcentaje, 0), 100)) / 100;
  const texto = `${numero.format(porcentaje)} %`;

  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(Math.max(value, 0), max)}
        aria-valuetext={`${texto}: ${formatValue(value)} de ${formatValue(max)}`}
        className="relative inline-flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`} fill="none" strokeWidth={grosor}>
            <circle cx={size / 2} cy={size / 2} r={radio} className={TRAZO[tono]} strokeOpacity={0.2} />
            {lleno > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radio}
                strokeLinecap="round"
                strokeDasharray={`${lleno} ${circunferencia}`}
                className={TRAZO[tono]}
                data-tono={tono}
              />
            )}
          </g>
        </svg>
        <span aria-hidden className="absolute text-sh-label font-semibold text-headline tabular-nums">
          {texto}
        </span>
      </div>
      {caption && <p className="text-sh-caption text-body">{caption}</p>}
    </div>
  );
}
