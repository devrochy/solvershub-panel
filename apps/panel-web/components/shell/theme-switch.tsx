"use client";

import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Interruptor de tema con el icono del tema activo dentro del pulgar. Accesible como
 * `role="switch"`; el pulgar se desliza y el color de la pista cambia en 200 ms.
 */
export function ThemeSwitch({
  oscuro,
  onChange,
  id,
}: {
  oscuro: boolean;
  onChange: (oscuro: boolean) => void;
  id?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={oscuro}
      aria-label="Tema oscuro"
      onClick={() => onChange(!oscuro)}
      className={cn(
        "relative inline-flex h-6 w-12 shrink-0 items-center rounded-full border px-0.5 transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
        oscuro ? "border-focus/50 bg-focus/20" : "border-control-border bg-bg-deep",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full bg-surface-raised shadow-sm ring-1 ring-border-soft",
          "transition-transform duration-200 ease-out",
          oscuro ? "translate-x-[24px]" : "translate-x-0",
        )}
      >
        {oscuro ? (
          <Moon className="h-3 w-3 text-link" />
        ) : (
          <Sun className="h-3 w-3 text-status-warning-fg" />
        )}
      </span>
    </button>
  );
}
