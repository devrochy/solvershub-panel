"use client";

import { usePathname } from "next/navigation";

import { TabLinks } from "@/components/ui/tab-links";

// PRU-01: Configurar test y Paso a producción son la misma lista por entorno: una pestaña, «Entornos».
const PESTANAS = [
  { href: "/pruebas", label: "Ejecutar" },
  { href: "/pruebas/datos", label: "Datos" },
  { href: "/pruebas/informes", label: "Informes" },
  { href: "/pruebas/ciclos", label: "Ciclos" },
  { href: "/pruebas/configuracion", label: "Entornos" },
];

export function PestanasDePruebas({ esMaster }: { esMaster: boolean }) {
  const pathname = usePathname();
  const items = esMaster ? [...PESTANAS, { href: "/pruebas/testers", label: "Testers" }] : PESTANAS;
  // Un informe (`/pruebas/informes/<id>`) marca Informes y Producción marca Entornos.
  const ruta = pathname.startsWith("/pruebas/produccion") ? "/pruebas/configuracion" : pathname;
  const actual =
    [...items].sort((a, b) => b.href.length - a.href.length).find((i) => ruta === i.href || ruta.startsWith(`${i.href}/`))
      ?.href ?? "/pruebas";
  return <TabLinks label="Secciones de Pruebas" items={items} current={actual} />;
}
