import type { ReactNode } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";

import { PestanasDePruebas } from "./_components/pestanas";

export const metadata = { title: "Pruebas" };

/**
 * Plataforma › Pruebas (SPEC-30): centro de pruebas de la plataforma, para el master y los
 * testers del entorno de test. Las pestañas se arman según lo que puede hacer cada uno: Testers
 * solo la ve el master (nunca un 403 por diseño).
 */
export default async function PruebasLayout({ children }: { children: ReactNode }) {
  const me = await apiFetch<Me>("/admin/me");
  const esMaster = me.ok && me.data.role === "master";
  return (
    <div className="flex flex-col gap-6">
      {/* PRU-01: la explicación vive en «¿Qué es esto?»; la cabecera no la repite en cada pestaña. */}
      <PageHeader title="Pruebas" helpSection="pruebas" tabs={<PestanasDePruebas esMaster={esMaster} />} />
      {children}
    </div>
  );
}
