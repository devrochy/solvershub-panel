import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TONO = {
  default: "text-headline",
  accent: "text-link",
  success: "text-status-success-fg",
  warning: "text-status-warning-fg",
  danger: "text-status-danger-fg",
} as const;

export type KpiDelta = {
  /** Variación en porcentaje (12 = +12 %). */
  value: number;
  /** Contra qué se compara: "los 7 días anteriores", "ayer"… */
  versus: string;
};

/** Texto del delta: siempre dice contra qué compara (DESIGN.md · Resumen). */
export function textoDelta({ value, versus }: KpiDelta): string {
  const signo = value > 0 ? "+" : value < 0 ? "−" : "";
  const cifra = Math.abs(value).toLocaleString("es-CO", { maximumFractionDigits: 1 });
  // «frente a el mes anterior» no se dice: la contracción es «frente al mes anterior».
  const contra = versus.startsWith("el ") ? `al ${versus.slice(3)}` : `a ${versus}`;
  return `${signo}${cifra} % frente ${contra}`;
}

/**
 * Métrica clave: valor, variación escrita con flecha y, opcional, una sparkline. Con
 * `polarity="up-bad"` subir es malo (mora, escalaciones). Con `href` toda la tarjeta
 * lleva a la lista que explica el número. `size="hero"` es la cifra principal de una sección
 * (el Resumen la usa una vez, en «Agente general»).
 */
export function KpiTile({
  label,
  value,
  delta,
  polarity = "up-good",
  hint,
  icon,
  sparkline,
  href,
  tone = "default",
  size = "default",
  loading,
  error,
  className,
}: {
  label: string;
  value?: ReactNode;
  delta?: KpiDelta;
  polarity?: "up-good" | "up-bad";
  hint?: ReactNode;
  icon?: ReactNode;
  sparkline?: ReactNode;
  href?: string;
  tone?: keyof typeof TONO;
  /** `hero`: la cifra principal de una sección; con `sparkline` la tendencia va al lado en pantallas anchas. */
  size?: "default" | "hero";
  loading?: boolean;
  error?: string;
  className?: string;
}) {
  const hero = size === "hero";
  const favorable = delta ? (polarity === "up-good" ? delta.value > 0 : delta.value < 0) : false;
  const Flecha = !delta || delta.value === 0 ? ArrowRight : delta.value > 0 ? ArrowUpRight : ArrowDownRight;

  const cuerpo = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] text-body">{label}</p>
        {icon && <span className="text-text-soft">{icon}</span>}
      </div>
      {loading ? (
        <div aria-busy="true">
          <Skeleton className="mt-3 h-8 w-28" />
          <Skeleton className="mt-2 h-3 w-40" />
        </div>
      ) : error ? (
        <p role="alert" className="mt-3 text-sm text-status-danger-fg">
          {error}
        </p>
      ) : (
        <div className={cn(hero && sparkline && "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between")}>
          <div>
            <p className={cn("mt-2 font-display text-sh-hero tabular-nums", TONO[tone])}>{value}</p>
            {delta && (
              <p
                className={cn(
                  "mt-1 inline-flex items-center gap-1 text-xs",
                  delta.value === 0 ? "text-text-soft" : favorable ? "text-status-success-fg" : "text-status-danger-fg",
                )}
              >
                <Flecha className="h-3.5 w-3.5" aria-hidden />
                {textoDelta(delta)}
              </p>
            )}
            {hint && <p className="mt-1 text-xs text-text-soft">{hint}</p>}
          </div>
          {sparkline && <div className={cn(hero ? "w-full sm:w-1/2" : "mt-3")}>{sparkline}</div>}
        </div>
      )}
    </>
  );

  const clases = cn("block rounded-lg border border-border-soft bg-surface", hero ? "p-6" : "p-5", className);
  return href ? (
    <Link href={href} className={cn(clases, "transition-colors hover:border-border-strong")}>
      {cuerpo}
    </Link>
  ) : (
    <div className={clases}>{cuerpo}</div>
  );
}
