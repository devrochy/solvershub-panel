import Link from "next/link";

import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Pestañas de sección que cambian de ruta (por ejemplo Agenda: Citas · Tipos · Bloqueos).
 * Como navegan, son enlaces dentro de un `nav` con `aria-current`, no un `tablist`
 * (ese es `Tabs`, para contenido dentro de la misma página).
 */
export function TabLinks({
  label,
  items,
  current,
  className,
}: {
  label: string;
  /** `count`: contador visible junto al nombre (por ejemplo los clientes de cada etapa). */
  items: { href: string; label: string; count?: number }[];
  current: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("flex gap-1 overflow-x-auto border-b border-border-soft", className)}>
      {items.map((item) => {
        const activa = item.href === current;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={activa ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-4 py-2 text-sm transition-colors",
              activa ? "border-focus text-headline" : "border-transparent text-body hover:text-headline",
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="ml-1.5 tabular-nums text-text-soft">{formatNumber(item.count)}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
