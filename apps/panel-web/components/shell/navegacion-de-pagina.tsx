"use client";

import { usePathname } from "next/navigation";

import { NAV_GROUPS } from "@/components/shell/nav";
import { useShell } from "@/components/shell/shell-context";
import { Breadcrumbs, type Miga } from "@/components/ui/breadcrumbs";
import { TabLinks } from "@/components/ui/tab-links";
import { gruposVisibles, migasPara, pestanasPara } from "@/lib/shell/navegacion";

/**
 * Migas automáticas del `PageHeader` (HU-DS-04): salen del menú (`nav.ts`) y de la ruta.
 * En un detalle, el último nivel es el título de la página. Sin shell, no muestra nada.
 */
export function MigasDeShell({ titulo, intermedias }: { titulo: string; intermedias?: Miga[] }) {
  const pathname = usePathname();
  const shell = useShell();
  if (!shell) return null;
  const migas = migasPara(pathname, gruposVisibles(shell.permisos, NAV_GROUPS, shell.esMaster), titulo, intermedias);
  return migas.length > 0 ? <Breadcrumbs items={migas} /> : null;
}

/** La pestaña más específica para la ruta: `/cobranza` es prefijo de todas las de Cobranza. */
function actualDe(pathname: string, items: { href: string }[]): string {
  return (
    items
      .filter((p) => pathname === p.href || pathname.startsWith(`${p.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? pathname
  );
}

/**
 * Pestañas de la entrada del menú (HU-UX-02). Con subgrupos (Cobranza) van dos filas: los
 * subgrupos y las pestañas del subgrupo actual.
 */
export function PestanasDeShell() {
  const pathname = usePathname();
  const shell = useShell();
  if (!shell) return null;
  const grupos = gruposVisibles(shell.permisos, NAV_GROUPS, shell.esMaster);
  const { subgrupos, subgrupoActual, pestanas, ocultas } = pestanasPara(pathname, grupos);
  if (subgrupos.length === 0 && pestanas.length === 0) return null;
  // En una página oculta (Bloqueos, Aliados) ninguna pestaña queda marcada.
  const actual = actualDe(pathname, [...pestanas, ...ocultas.map((href) => ({ href }))]);
  return (
    <div className="flex flex-col gap-2">
      {subgrupos.length > 0 && <TabLinks label="Grupos de la sección" items={subgrupos} current={subgrupoActual ?? ""} />}
      {pestanas.length > 0 && <TabLinks label="Secciones" items={pestanas} current={actual} />}
    </div>
  );
}
