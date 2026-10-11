"use client";

import { cn } from "@/lib/utils";

/** Interruptor accesible (role="switch"). Sin dependencias, controlado. */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  "aria-label": ariaLabel,
  id,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
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
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-pill border transition-colors duration-150",
        checked ? "border-focus bg-focus/25" : "border-control-border bg-bg-deep",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "block h-3.5 w-3.5 rounded-full transition-transform duration-150",
          checked ? "translate-x-[18px] bg-focus" : "translate-x-[3px] bg-text-soft",
        )}
      />
    </button>
  );
}
