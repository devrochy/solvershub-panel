import Link from "next/link";

import { cn } from "@/lib/utils";

export type FilterChip = { label: string; href: string; active?: boolean };

/**
 * Filtros de una lista como enlaces (se pueden compartir y el servidor filtra). Estilo
 * contorno: el activo usa el acento y los demás quedan neutros. Sin estado propio.
 */
export function FilterChips({
  label,
  items,
  className,
}: {
  label: string;
  items: FilterChip[];
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {items.map((item) => (
        <Link
          key={`${item.label}-${item.href}`}
          href={item.href}
          aria-current={item.active ? "true" : undefined}
          className={cn(
            "inline-flex h-8 items-center rounded-md border px-2.5 text-sm transition-colors",
            item.active
              ? "border-focus bg-focus/10 text-headline"
              : "border-border-soft text-body hover:border-border-strong hover:text-headline",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
