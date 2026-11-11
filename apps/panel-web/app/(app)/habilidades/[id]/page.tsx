import { notFound } from "next/navigation";

import { estadoDeHabilidad } from "@/app/(app)/habilidades/_components/plugin-card";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { JsonSchemaForm } from "@/components/domain/json-schema-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { PluginConfigResponse, PluginSummary } from "@/lib/api/types";

/**
 * Ajustes de una habilidad (CFG-07): se titula con su nombre visible y su estado en palabras; las migas
 * llevan de vuelta a Habilidades. Una habilidad sin ajustes lo dice en vez de romper la pantalla.
 */
export default async function PluginConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [res, listaRes] = await Promise.all([
    apiFetch<PluginConfigResponse>(`/admin/plugins/${id}/config`),
    apiFetch<PluginSummary[]>("/admin/plugins"),
  ]);
  if (!res.ok && res.status === 404) notFound();
  const resumen = listaRes.ok ? listaRes.data.find((p) => p.id === id) : undefined;
  const nombre = resumen?.display_name || resumen?.name || (res.ok ? res.data.name : id);

  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={nombre} />
        <ErrorDeCarga titulo="No pudimos cargar los ajustes de esta habilidad" detalle={res.error} />
      </div>
    );
  }
  const config = res.data;
  const estado = resumen ? estadoDeHabilidad(resumen) : null;
  const propiedades = (config.schema as { properties?: Record<string, unknown> } | undefined)?.properties;
  const conAjustes = Boolean(propiedades && Object.keys(propiedades).length > 0);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        title={nombre}
        description={config.description ?? resumen?.description ?? undefined}
        actions={estado ? <Badge variant={estado.tono}>{estado.etiqueta}</Badge> : undefined}
      />

      <Card>
        {conAjustes ? (
          <CardContent className="pt-5">
            <JsonSchemaForm
              resourcePath={`/api/plugins/${id}`}
              schema={config.schema}
              initialValues={config.values}
              configuredSecrets={config.configured_secrets}
              // Guardar los ajustes también la enciende (como antes, «Guardar y activar»).
              submitLabel={resumen?.enabled_for_tenant ? "Guardar" : "Guardar y encender"}
            />
          </CardContent>
        ) : (
          <EmptyState title="Esta habilidad no tiene ajustes" description="Funciona tal como viene: solo se enciende o se apaga desde Habilidades." />
        )}
      </Card>
    </div>
  );
}
