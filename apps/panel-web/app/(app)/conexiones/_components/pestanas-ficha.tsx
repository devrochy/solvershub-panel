"use client";

import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuLinkItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TabLinks } from "@/components/ui/tab-links";
import { cn } from "@/lib/utils";

type Pestana = { href: string; label: string; avanzada: boolean };

/**
 * Pestañas de la ficha de una conexión (HU-UX-09). El layout no se vuelve a renderizar al
 * navegar, así que la pestaña activa sale de la ruta en el cliente: la de prefijo más largo
 * (`/webhook/credenciales` deja activa Webhook). Las avanzadas van en un menú «Avanzado» para
 * que la fila no pase de seis.
 */
export function PestanasFicha({ items }: { items: Pestana[] }) {
  const ruta = usePathname() ?? "";
  const activa =
    items
      .filter((i) => ruta === i.href || ruta.startsWith(`${i.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? "";
  const visibles = items.filter((i) => !i.avanzada);
  const avanzadas = items.filter((i) => i.avanzada);
  const avanzadaActiva = avanzadas.find((i) => i.href === activa);

  if (avanzadas.length === 0) return <TabLinks label="Secciones de la conexión" items={visibles} current={activa} />;

  return (
    <div className="flex items-end overflow-x-auto overflow-y-hidden border-b border-border-soft">
      {/* Una sola fila que se desplaza: «Avanzado» va siempre después de la última pestaña. */}
      <TabLinks label="Secciones de la conexión" items={visibles} current={activa} size="compact" className="shrink-0 overflow-visible border-b-0" />
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "-mb-px inline-flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
            avanzadaActiva ? "border-focus text-headline" : "border-transparent text-body hover:text-headline",
          )}
          aria-current={avanzadaActiva ? "page" : undefined}
        >
          {avanzadaActiva ? `Avanzado: ${avanzadaActiva.label}` : "Avanzado"}
          <ChevronDown className="h-4 w-4" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {avanzadas.map((i) => (
            <DropdownMenuLinkItem key={i.href} href={i.href}>
              {i.label}
            </DropdownMenuLinkItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
