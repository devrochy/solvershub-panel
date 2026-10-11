import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";

/** Barra de consumo: tono por umbral, texto accesible con el valor real. */
export function UsageBar({
  label,
  used,
  limit,
  percent,
  unit,
  exceeded,
  className,
}: {
  label: string;
  used: number;
  limit: number | null;
  percent: number | null;
  unit: string;
  exceeded?: boolean;
  className?: string;
}) {
  const ratio = percent ?? 0;
  const tone = exceeded ? "bg-status-danger-fg" : ratio >= 80 ? "bg-status-warning-fg" : "bg-data-single";
  const limitLabel = limit === null ? "∞" : formatNumber(limit);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-headline">{label}</span>
        <span className="text-body">
          {formatNumber(used)} / {limitLabel}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-pill bg-hover"
        role="progressbar"
        aria-label={label}
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit ?? undefined}
      >
        <div
          className={cn("h-full rounded-pill transition-[width] duration-200", tone)}
          style={{ width: `${Math.min(ratio, 100)}%` }}
        />
      </div>
      <span className="text-xs text-text-soft">{unit}</span>
    </div>
  );
}
