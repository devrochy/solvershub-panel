import { ChecklistProduccion } from "@/components/domain/checklist-produccion";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { PlatformMetaApp } from "@/lib/api/types";

export const metadata = { title: "App de Meta" };

/** "Plataforma → App de Meta" (solo master, HU-CONN-07): la app de la plataforma y la infraestructura. */
export default async function AppDeMetaPage() {
  const res = await apiFetch<PlatformMetaApp>("/admin/platform/meta-app");
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        {res.status === 403 ? "Solo el admin de plataforma puede ver esto." : `Error: ${res.error}`}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="App de Meta"
        description="Chequeos de la app de Meta de la plataforma y de la infraestructura. Corren en segundo plano y queda guardado el último resultado."
      />
      <p className="text-sm text-body">
        App de la plataforma:{" "}
        <span className="font-mono text-xs">{res.data.meta_app_id || "sin configurar"}</span>
      </p>
      <ChecklistProduccion endpoint="/api/platform/meta-app" initial={res.data} />
    </div>
  );
}
