"use client";

import { usePathname } from "next/navigation";

import { TabLinks } from "@/components/ui/tab-links";

/** Pestañas de la ficha de cartera (rutas hijas); la más específica es la actual. */
export function FichaTabs({ carteraId }: { carteraId: string }) {
  const pathname = usePathname();
  const base = `/cobranza/carteras/${carteraId}`;
  const items = [
    { href: base, label: "Resumen" },
    { href: `${base}/clientes`, label: "Clientes" },
    { href: `${base}/caja`, label: "Caja" },
    { href: `${base}/ruta`, label: "Ruta del día" },
    { href: `${base}/notas`, label: "Notas" },
  ];
  const actual =
    items
      .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? base;
  return <TabLinks label="Secciones de la cartera" items={items} current={actual} />;
}
