import { PluginCard } from "@/app/(app)/habilidades/_components/plugin-card";
import { SubscriptionProviderCard } from "@/app/(app)/habilidades/_components/subscription-provider-card";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { PluginSummary, SubscriptionProviderSettings } from "@/lib/api/types";

export const metadata = { title: "Habilidades" };

export default async function PluginsPage() {
  const [res, proveedorRes] = await Promise.all([
    apiFetch<PluginSummary[]>("/admin/plugins"),
    apiFetch<SubscriptionProviderSettings>("/admin/settings/subscription-provider"),
  ]);
  const cabecera = (
    <PageHeader
      title="Habilidades"
      description="Lo que tu asistente sabe hacer además de conversar. Enciende las que usa tu negocio; si una falla, el resto sigue funcionando."
      helpSection="plugins"
    />
  );
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        {cabecera}
        <ErrorDeCarga titulo="No pudimos cargar las habilidades" detalle={res.error} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {cabecera}

      {proveedorRes.ok && proveedorRes.data.estado !== "sin_proveedor" && (
        <SubscriptionProviderCard settings={proveedorRes.data} />
      )}

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
