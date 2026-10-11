import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type Miga = { label: string; href?: string };

/**
 * Migas de pan: dónde estoy dentro del menú (grupo › sección › detalle). En celular se
 * reducen a "‹ anterior" para no ocupar una línea entera. La última es la página actual.
 */
export function Breadcrumbs({ items, className }: { items: Miga[]; className?: string }) {
  if (items.length === 0) return null;
  const anterior = [...items.slice(0, -1)].reverse().find((m) => m.href);
  return (
    <nav aria-label="Migas de pan" className={cn("text-xs text-text-soft", className)}>
      {anterior?.href && (
        <Link href={anterior.href} className="inline-flex items-center gap-1 hover:text-headline sm:hidden">
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          {anterior.label}
        </Link>
      )}
      <ol className="hidden flex-wrap items-center gap-1 sm:flex">
        {items.map((miga, i) => {
          const ultima = i === items.length - 1;
          return (
            <li key={`${miga.label}-${i}`} className="inline-flex items-center gap-1">
              {miga.href && !ultima ? (
                <Link href={miga.href} className="hover:text-headline hover:underline">
                  {miga.label}
                </Link>
              ) : (
                <span aria-current={ultima ? "page" : undefined} className={cn(ultima && "text-body")}>
                  {miga.label}
                </span>
              )}
              {!ultima && <ChevronRight className="h-3 w-3" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
