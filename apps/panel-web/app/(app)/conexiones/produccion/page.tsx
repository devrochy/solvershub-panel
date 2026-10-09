import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";

export const metadata = { title: "Producción" };

type HealthConnection = components["schemas"]["HealthConnection"];

/**
 * Producción (HU-CONN-07): el checklist es de cada conexión, así que aquí se elige cuál
 * revisar. Los pasos manuales de la app de Meta están en "Requisitos de Meta".
 */
export default async function ProduccionPage() {
  const res = await apiFetch<{ connections: HealthConnection[] }>("/admin/meta/health");
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar las conexiones: {res.error}
      </p>
    );
  }
  const connections = res.data.connections.filter((c) => c.status !== "revoked" && c.status !== "draft");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Producción"
        description="Cada conexión tiene su checklist de producción, revisado con sus propias credenciales."
      />
      {connections.length === 0 ? (
        <EmptyState
          title="Sin conexiones de Meta"
          description="Conecta WhatsApp Business para revisar qué le falta para producción."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {connections.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-wrap items-center gap-3 pt-5">
                <span className="text-headline">{c.channel}</span>
                <Badge variant={c.environment === "sandbox" ? "warning" : "neutral"}>
                  {c.environment === "sandbox" ? "Prueba" : "Producción"}
                </Badge>
                <span className="font-mono text-xs text-text-soft">{c.meta_app_id}</span>
                <Button asChild className="ml-auto" size="sm" variant="outline">
                  <Link href={`/conexiones/meta/${c.id}/produccion`}>Ver checklist</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
