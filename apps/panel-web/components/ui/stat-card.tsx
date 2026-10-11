import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  default: "text-headline",
  accent: "text-link",
  success: "text-status-success-fg",
  warning: "text-status-warning-fg",
  danger: "text-status-danger-fg",
};

/** Tarjeta de métrica (KPI). Un solo número destacado, sin decoración extra. */
export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: keyof typeof TONE;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border-soft bg-surface p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] text-body">{label}</p>
        {icon && <span className="text-text-soft">{icon}</span>}
      </div>
      <p className={cn("mt-2 font-display text-3xl font-bold tracking-tight", TONE[tone])}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-text-soft">{hint}</p>}
    </div>
  );
}
