import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";

export const metadata = { title: "Plantillas de WhatsApp" };

type HealthConnection = { id: string; label?: string | null; waba_id?: string | null };

export default async function PlantillasPage() {
  const res = await apiFetch<{ connections: HealthConnection[] }>("/admin/meta/health");
  const connections = res.ok ? (res.data.connections ?? []) : [];

  // Como en el clásico: la entrada del menú resuelve la conexión del negocio; con
  // una sola, entra directo a sus plantillas.
  if (connections.length === 1) {
    redirect(`/conexiones/meta/${connections[0].id}/plantillas`);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Plantillas de WhatsApp"
        description="Las plantillas viven en la WABA de cada conexión."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/plantillas/eventos">Plantillas por evento</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/plantillas-opciones">Plantillas con opciones</Link>
            </Button>
          </>
        }
      />
      {connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 pt-5">
            <p className="text-sm text-body">
              Este negocio no tiene ninguna conexión de WhatsApp todavía.
            </p>
            <Button asChild variant="accent">
              <Link href="/conexiones">Ir a Conexiones</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-body">Elige la conexión:</p>
          <div className="flex flex-wrap gap-2">
            {connections.map((c) => (
              <Button key={c.id} asChild variant="outline">
                <Link href={`/conexiones/meta/${c.id}/plantillas`}>
                  {c.label || c.waba_id || c.id.slice(0, 8)}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
