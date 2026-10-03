import Link from "next/link";

import { PluginActions } from "@/app/(app)/habilidades/_components/plugin-actions";
import { PLUGIN_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PluginSummary } from "@/lib/api/types";

/** Tarjeta de habilidad: estado, salud, habilitación y acceso a configuración. */
export function PluginCard({ plugin }: { plugin: PluginSummary }) {
  const hasError = Boolean(plugin.error_message || plugin.tenant_health_error);
  const nombre = plugin.display_name || plugin.name;
  const categoria = plugin.category;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle>{nombre}</CardTitle>
          <StatusBadge value={plugin.status} map={PLUGIN_STATUS} />
        </div>
        <p className="font-mono text-xs text-text-soft">
          {plugin.id}
          {categoria ? ` · ${categoria}` : ""} · v{plugin.version}
        </p>
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
          enabled={plugin.enabled_for_tenant}
          hasError={hasError}
        />

        {hasError && (
          <p className="text-xs text-danger">
            {plugin.tenant_health_error ?? plugin.error_message}
          </p>
        )}

        <div className="mt-auto flex items-center gap-2">
          {plugin.has_config ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/habilidades/${plugin.id}`}>Configurar</Link>
            </Button>
          ) : (
            <span className="text-xs text-text-soft">Sin configuración</span>
          )}
          {plugin.min_plan && plugin.min_plan !== "free" && (
            <span className="text-xs text-text-soft">Plan {plugin.min_plan}+</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
