"use client";

import * as RadioPrimitive from "@radix-ui/react-radio-group";

import { cn } from "@/lib/utils";

/** Grupo de opciones excluyentes con nombre accesible. Flechas para moverse (Radix). */
export function RadioGroup({
  label,
  name,
  options,
  value,
  onValueChange,
  disabled,
  className,
}: {
  label: string;
  name: string;
  options: { value: string; label: string; description?: string }[];
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <RadioPrimitive.Root
      aria-label={label}
      name={name}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      className={cn("flex flex-col gap-2", className)}
    >
      {options.map((opcion) => {
        const id = `${name}-${opcion.value}`;
        return (
          <div key={opcion.value} className="flex items-start gap-2">
            <RadioPrimitive.Item
              id={id}
              value={opcion.value}
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-control-border bg-surface",
                "data-[state=checked]:border-focus disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <RadioPrimitive.Indicator className="h-2 w-2 rounded-full bg-focus" />
            </RadioPrimitive.Item>
            <label htmlFor={id} className="flex flex-col text-sm text-headline">
              {opcion.label}
              {opcion.description && <span className="text-xs text-text-soft">{opcion.description}</span>}
            </label>
          </div>
        );
      })}
    </RadioPrimitive.Root>
  );
}
