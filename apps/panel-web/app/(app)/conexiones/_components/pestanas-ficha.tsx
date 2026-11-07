"use client";

import { usePathname } from "next/navigation";

import { TabLinks } from "@/components/ui/tab-links";

/**
 * Pestañas de la ficha de una conexión (HU-UX-09). El layout no se vuelve a renderizar al
 * navegar, así que la pestaña activa sale de la ruta en el cliente: la de prefijo más largo
 * (`/webhook/credenciales` deja activa Webhook).
 */
export function PestanasFicha({ items }: { items: { href: string; label: string }[] }) {
  const ruta = usePathname() ?? "";
  const activa =
    items
      .filter((i) => ruta === i.href || ruta.startsWith(`${i.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? "";
  return <TabLinks label="Secciones de la conexión" items={items} current={activa} />;
}
