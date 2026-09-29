import { PluginCard } from "@/app/(app)/habilidades/_components/plugin-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { PluginSummary } from "@/lib/api/types";

export const metadata = { title: "Habilidades" };

export default async function PluginsPage() {
  const res = await apiFetch<PluginSummary[]>("/admin/plugins");
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar las habilidades: {res.error}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Habilidades"
        description="Módulos que se suman al agente. El alcance es por negocio: al activar uno se carga su código y su salud se controla aislada por negocio (si falla, se puede reintentar sin afectar al resto)."
      />

      {res.data.length === 0 ? (
        <EmptyState
          title="Sin habilidades disponibles"
          description="Cuando se instale un módulo, aparecerá aquí para configurarlo."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {res.data.map((plugin) => (
            <PluginCard key={plugin.id} plugin={plugin} />
          ))}
        </div>
      )}
    </div>
  );
}
