"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

export type TabItem = { id: string; label: string };

/** Pestañas accesibles y controladas. Solo presentación + teclado. */
export function Tabs({
  items,
  value,
  onValueChange,
  size = "default",
  className,
}: {
  items: TabItem[];
  value: string;
  onValueChange: (id: string) => void;
  /** `compact`: menos relleno, para que quepan más pestañas en el celular. */
  size?: "default" | "compact";
  className?: string;
}) {
  const activaRef = useRef<HTMLButtonElement>(null);
  const filaRef = useRef<HTMLDivElement>(null);

  // Si no caben todas, la fila (no la página) se desplaza sola hasta la activa. Con
  // `scrollIntoView` la página saltaba hasta las pestañas cuando estaban bajo el primer pantallazo.
  useEffect(() => {
    const activa = activaRef.current;
    const fila = filaRef.current;
    if (!activa || !fila || fila.scrollWidth <= fila.clientWidth) return;
    const caja = fila.getBoundingClientRect();
    const pestana = activa.getBoundingClientRect();
    if (pestana.right > caja.right) fila.scrollLeft += pestana.right - caja.right;
    else if (pestana.left < caja.left) fila.scrollLeft -= caja.left - pestana.left;
  }, [value]);

  function onKeyDown(event: KeyboardEvent) {
    const index = items.findIndex((item) => item.id === value);
    if (event.key === "ArrowRight") {
      event.preventDefault();
      onValueChange(items[(index + 1) % items.length].id);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      onValueChange(items[(index - 1 + items.length) % items.length].id);
    }
  }

  return (
    <div
      ref={filaRef}
      role="tablist"
      onKeyDown={onKeyDown}
      // overflow-x-auto: en celular las pestañas no caben y empujaban toda la página.
      className={cn("flex gap-1 overflow-x-auto border-b border-border-soft", className)}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            ref={active ? activaRef : undefined}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onValueChange(item.id)}
            className={cn(
              "-mb-px shrink-0 border-b-2 py-2 text-sm whitespace-nowrap transition-colors duration-150",
              size === "compact" ? "px-3" : "px-4",
              active
                ? "border-focus text-headline"
                : "border-transparent text-body hover:text-headline",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
