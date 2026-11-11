import Link from "next/link";

import { PluginActions } from "@/app/(app)/habilidades/_components/plugin-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PluginSummary } from "@/lib/api/types";

/** Estado de una habilidad en palabras (CFG-06): encendida, apagada o con un problema. */
export function estadoDeHabilidad(plugin: Pick<PluginSummary, "enabled_for_tenant" | "error_message" | "tenant_health_error">) {
  if (plugin.error_message || (plugin.enabled_for_tenant && plugin.tenant_health_error)) return { etiqueta: "Con un problema", tono: "danger" as const };
  return plugin.enabled_for_tenant ? { etiqueta: "Activa", tono: "success" as const } : { etiqueta: "Apagada", tono: "neutral" as const };
}

/** Tarjeta de habilidad: qué hace, su estado en palabras, encenderla y sus ajustes. */
export function PluginCard({ plugin }: { plugin: PluginSummary }) {
  const hasError = Boolean(plugin.error_message || plugin.tenant_health_error);
  const nombre = plugin.display_name || plugin.name;
  const estado = estadoDeHabilidad(plugin);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle>{nombre}</CardTitle>
          <Badge variant={estado.tono}>{estado.etiqueta}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {plugin.description && <p className="text-sm text-body">{plugin.description}</p>}

        {plugin.action_summary && plugin.action_summary.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {plugin.action_summary.map((accion) => (
              <li
                key={accion}
                className="rounded-md bg-surface px-2 py-0.5 text-xs text-body"
              >
                {accion}
              </li>
            ))}
          </ul>
        )}

        {plugin.required_connections && plugin.required_connections.length > 0 && (
          <p className="text-xs text-text-soft">
            Requiere: {plugin.required_connections.join(", ")}
          </p>
        )}

        <PluginActions
          pluginId={plugin.id}
          nombre={nombre}
          enabled={plugin.enabled_for_tenant}
          hasError={hasError}
        />

        {hasError && (
          <p className="text-xs text-status-danger-fg">
            No se pudo cargar en este negocio; el resto del asistente sigue funcionando. Detalle: {plugin.tenant_health_error ?? plugin.error_message}
          </p>
        )}

        <div className="mt-auto flex items-center gap-2">
          {plugin.has_config ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/habilidades/${plugin.id}`} aria-label={`Ajustes de ${nombre}`}>
                Ajustes
              </Link>
            </Button>
          ) : (
            <span className="text-xs text-text-soft">No tiene ajustes</span>
          )}
          {plugin.min_plan && plugin.min_plan !== "free" && (
            <span className="text-xs text-text-soft">Plan {plugin.min_plan}+</span>
          )}
          <span className="ml-auto text-xs text-text-soft">Versión {plugin.version}</span>
        </div>
      </CardContent>
    </Card>
  );
}
