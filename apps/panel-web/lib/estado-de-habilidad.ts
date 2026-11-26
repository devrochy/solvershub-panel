import type { PluginSummary } from "@/lib/api/types";

/** Estado de una habilidad en palabras (CFG-06): encendida, apagada o con un problema. */
export function estadoDeHabilidad(plugin: Pick<PluginSummary, "enabled_for_tenant" | "error_message" | "tenant_health_error">) {
  if (plugin.error_message || (plugin.enabled_for_tenant && plugin.tenant_health_error)) return { etiqueta: "Con un problema", tono: "danger" as const };
  return plugin.enabled_for_tenant ? { etiqueta: "Activa", tono: "success" as const } : { etiqueta: "Apagada", tono: "neutral" as const };
}
