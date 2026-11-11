import Link from "next/link";

import { TabLinkActiva } from "@/components/ui/tab-link-activa";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Pestañas de sección que cambian de ruta (por ejemplo Agenda: Citas · Tipos · Bloqueos).
 * Como navegan, son enlaces dentro de un `nav` con `aria-current`, no un `tablist`
 * (ese es `Tabs`, para contenido dentro de la misma página).
 *
 * `size="compact"` es para filas largas (la ficha del agente, HU-UX-09): menos relleno lateral.
 * Si no caben (en el celular, casi siempre), la fila se desplaza sola hasta la pestaña activa.
 */
export function TabLinks({
  label,
  items,
  current,
  size = "default",
  className,
}: {
  label: string;
  /** `count`: contador visible junto al nombre (por ejemplo los clientes de cada etapa). */
  items: { href: string; label: string; count?: number }[];
  current: string;
  size?: "default" | "compact";
  className?: string;
}) {
  const compacta = size === "compact";
  return (
    <nav
      aria-label={label}
      className={cn("flex overflow-x-auto border-b border-border-soft", compacta ? "gap-0.5" : "gap-1", className)}
    >
      {items.map((item) => {
        const activa = item.href === current;
        // La activa siempre queda a la vista: en el celular la fila no cabe (VEN-15).
        const Enlace = activa ? TabLinkActiva : Link;
        return (
          <Enlace
            key={item.href}
            href={item.href}
            aria-current={activa ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 py-2 text-sm transition-colors",
              compacta ? "px-3" : "px-4",
              activa ? "border-focus text-headline" : "border-transparent text-body hover:text-headline",
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="ml-1.5 tabular-nums text-text-soft">{formatNumber(item.count)}</span>
            )}
          </Enlace>
        );
      })}
    </nav>
  );
}
