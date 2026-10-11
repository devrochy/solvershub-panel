import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonSchemaForm } from "@/components/domain/json-schema-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { PluginConfigResponse } from "@/lib/api/types";

export default async function PluginConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await apiFetch<PluginConfigResponse>(`/admin/plugins/${id}/config`);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar la habilidad: {res.error}
      </p>
    );
  }
  const config = res.data;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/habilidades">← Volver</Link>
      </Button>

      <PageHeader
        title={config.name}
        description={config.description ?? undefined}
        actions={<Badge variant="neutral">{config.plugin_id}</Badge>}
      />

      <Card>
        <CardContent className="pt-5">
          <JsonSchemaForm
            resourcePath={`/api/plugins/${id}`}
            schema={config.schema}
            initialValues={config.values}
            configuredSecrets={config.configured_secrets}
            submitLabel="Guardar y activar"
          />
        </CardContent>
      </Card>
    </div>
  );
}
