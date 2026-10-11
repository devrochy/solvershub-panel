"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Casilla con etiqueta. `checked="indeterminate"` para la selección parcial de una tabla.
 * El borde usa `control-border` (≥ 3:1) y el marcado el foco del tema.
 */
export function Checkbox({
  id,
  label,
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  id: string;
  label: string;
  checked: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <CheckboxPrimitive.Root
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onCheckedChange?.(v === true)}
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-control-border bg-surface transition-colors",
          "data-[state=checked]:border-focus data-[state=checked]:bg-focus data-[state=indeterminate]:border-focus data-[state=indeterminate]:bg-focus",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <CheckboxPrimitive.Indicator className="text-surface">
          {checked === "indeterminate" ? <Minus className="h-3 w-3" aria-hidden /> : <Check className="h-3 w-3" aria-hidden />}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <label htmlFor={id} className={cn("text-sm text-headline", disabled && "opacity-50")}>
        {label}
      </label>
    </div>
  );
}
