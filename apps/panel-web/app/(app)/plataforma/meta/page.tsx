import { redirect } from "next/navigation";

import { ChecklistProduccion } from "@/components/domain/checklist-produccion";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { PlatformMetaApp } from "@/lib/api/types";

export const metadata = { title: "App de Meta" };

/**
 * "Plataforma → App de Meta" (solo master, HU-CONN-07, PLT-07): la app de la plataforma y la
 * infraestructura. Lo que falla va primero con cómo arreglarlo; lo que está en orden, plegado. Los
 * requisitos de Embedded Signup son la otra pestaña.
 */
export default async function AppDeMetaPage() {
  const res = await apiFetch<PlatformMetaApp>("/admin/platform/meta-app");
  // PLT-04: sin permiso no hay página de error; se vuelve al inicio.
  if (!res.ok && res.status === 403) redirect("/dashboard");
  const header = <PageHeader title="App de Meta" helpSection="meta_app" />;
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorDeCarga titulo="No pudimos cargar la revisión de la app de Meta" detalle={res.error} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {header}
      <ChecklistProduccion endpoint="/api/platform/meta-app" initial={res.data} plataforma />
      <details className="text-sm text-text-soft">
        <summary className="cursor-pointer">Detalles</summary>
        <p className="mt-1">App de la plataforma: {res.data.meta_app_id || "sin configurar"}</p>
      </details>
    </div>
  );
}
