"use client";

import { usePathname } from "next/navigation";

import { TabLinks } from "@/components/ui/tab-links";

const PESTANAS = [
  { href: "/pruebas", label: "Ejecutar" },
  { href: "/pruebas/datos", label: "Datos de prueba" },
  { href: "/pruebas/informes", label: "Informes" },
  { href: "/pruebas/ciclos", label: "Ciclos" },
  { href: "/pruebas/configuracion", label: "Configurar test" },
  { href: "/pruebas/produccion", label: "Paso a producción" },
];

export function PestanasDePruebas({ esMaster }: { esMaster: boolean }) {
  const pathname = usePathname();
  const items = esMaster ? [...PESTANAS, { href: "/pruebas/testers", label: "Testers" }] : PESTANAS;
  // Un informe (`/pruebas/informes/<id>`) marca la pestaña Informes.
  const actual =
    [...items].sort((a, b) => b.href.length - a.href.length).find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
      ?.href ?? "/pruebas";
  return <TabLinks label="Secciones de Pruebas" items={items} current={actual} />;
}
