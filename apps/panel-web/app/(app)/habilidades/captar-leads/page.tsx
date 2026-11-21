import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { JsonSchemaForm } from "@/components/domain/json-schema-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { CaptarLeadsConfigResponse } from "@/lib/api/types";

export const metadata = { title: "Captar leads" };

const DESCRIPCION =
  "El formulario de tu página y los avisos de seguimiento de tus leads. Funciona con cualquier agente que tenga Captar leads, aunque no vendas productos.";

/**
 * Captar leads (HU-AOS-70, ADR-0193 §6): no es un pack, así que no sale en la lista de habilidades; su config vive
 * en el core. Activar el intake, el secreto del formulario, la llave de Turnstile y el cupo, y los avisos de seguimiento.
 */
export default async function CaptarLeadsPage() {
  const res = await apiFetch<CaptarLeadsConfigResponse>("/admin/captar-leads/config");
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Captar leads" description={DESCRIPCION} />
        <ErrorDeCarga titulo="No pudimos cargar la configuración de Captar leads" detalle={res.error} />
      </div>
    );
  }
  const config = res.data;
  const intakeActivo = Boolean((config.values as Record<string, unknown>).lead_intake_enabled);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="Captar leads"
        description={DESCRIPCION}
        actions={
          <Badge variant={intakeActivo ? "success" : "neutral"}>
            {intakeActivo ? "Formulario activo" : "Formulario apagado"}
          </Badge>
        }
      />
      {!config.configured && (
        <p className="text-sm text-body">Todavía no has guardado esta configuración: ves los valores por defecto.</p>
      )}
      <Card>
        <CardContent className="pt-5">
          <JsonSchemaForm
            resourcePath="/api/captar-leads/config"
            schema={config.schema}
            initialValues={config.values}
            configuredSecrets={config.configured_secrets}
            submitLabel="Guardar"
          />
        </CardContent>
      </Card>
    </div>
  );
}
