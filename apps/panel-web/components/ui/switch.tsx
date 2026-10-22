"use client";

import { cn } from "@/lib/utils";

/** Tono del interruptor encendido: foco (por defecto), éxito o peligro. */
export type SwitchTone = "default" | "success" | "danger";

const TONO: Record<SwitchTone, { pista: string; bola: string }> = {
  default: { pista: "border-focus bg-focus/25", bola: "bg-focus" },
  success: { pista: "border-status-success-border bg-status-success-bg", bola: "bg-status-success-fg" },
  danger: { pista: "border-status-danger-border bg-status-danger-bg", bola: "bg-status-danger-fg" },
};

/** Interruptor accesible (role="switch"). Sin dependencias, controlado. */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  tone = "default",
  "aria-label": ariaLabel,
  id,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  tone?: SwitchTone;
  "aria-label"?: string;
  id?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-pill border transition-[background-color,border-color,transform] duration-150 active:scale-95",
        checked ? TONO[tone].pista : "border-control-border bg-bg-deep",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "block h-3.5 w-3.5 rounded-full transition-transform duration-150",
          checked ? cn("translate-x-[18px]", TONO[tone].bola) : "translate-x-[3px] bg-text-soft",
        )}
      />
    </button>
  );
}
