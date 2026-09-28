import Link from "next/link";

import { PluginActions } from "@/app/(app)/habilidades/_components/plugin-actions";
import { PLUGIN_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PluginSummary } from "@/lib/api/types";

/** Tarjeta de habilidad: estado, salud, habilitación y acceso a configuración. */
export function PluginCard({ plugin }: { plugin: PluginSummary }) {
  const hasError = Boolean(plugin.error_message || plugin.tenant_health_error);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle>{plugin.name}</CardTitle>
          <StatusBadge value={plugin.status} map={PLUGIN_STATUS} />
        </div>
        <p className="font-mono text-xs text-text-soft">
          {plugin.id} · v{plugin.version}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
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

        <div className="mt-auto">
          {plugin.has_config ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/habilidades/${plugin.id}`}>Configurar</Link>
            </Button>
          ) : (
            <span className="text-xs text-text-soft">Sin configuración</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
