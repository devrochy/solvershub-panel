"use client";

import { usePathname } from "next/navigation";

import { NAV_GROUPS } from "@/components/shell/nav";
import { useShell } from "@/components/shell/shell-context";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { TabLinks } from "@/components/ui/tab-links";
import { gruposVisibles, migasPara, pestanasPara } from "@/lib/shell/navegacion";

/**
 * Migas automáticas del `PageHeader` (HU-DS-04): salen del menú (`nav.ts`) y de la ruta.
 * En un detalle, el último nivel es el título de la página. Sin shell, no muestra nada.
 */
export function MigasDeShell({ titulo }: { titulo: string }) {
  const pathname = usePathname();
  const shell = useShell();
  if (!shell) return null;
  const migas = migasPara(pathname, gruposVisibles(shell.permisos, NAV_GROUPS, shell.esMaster), titulo);
  return migas.length > 0 ? <Breadcrumbs items={migas} /> : null;
}

/** Pestañas de sección automáticas: las hermanas de la sección dentro de su pack. */
export function PestanasDeShell() {
  const pathname = usePathname();
  const shell = useShell();
  if (!shell) return null;
  const grupos = gruposVisibles(shell.permisos, NAV_GROUPS, shell.esMaster);
  const pestanas = pestanasPara(pathname, grupos);
  if (pestanas.length === 0) return null;
  // La más específica: `/calendario` es prefijo de todas las de Agenda.
  const actual =
    pestanas
      .filter((p) => pathname === p.href || pathname.startsWith(`${p.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? pathname;
  return <TabLinks label="Secciones" items={pestanas} current={actual} />;
}
