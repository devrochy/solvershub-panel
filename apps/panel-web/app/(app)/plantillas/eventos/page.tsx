import { MissingTemplatesBanner } from "@/components/domain/missing-templates-banner";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { MessageTemplatesSettings } from "@/lib/api/types";

import { EventTemplatesEditor } from "./_components/event-templates-editor";

export const metadata = { title: "Plantillas por evento" };

export default async function PlantillasPorEventoPage() {
  const res = await apiFetch<MessageTemplatesSettings>("/admin/settings/message-templates");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Plantillas por evento"
        description="Qué plantilla aprobada se envía en cada aviso cuando el cliente lleva más de 24 horas sin escribir. Dentro de las 24 horas se envía el texto de respaldo."
      />
      <MissingTemplatesBanner />
      {res.ok ? (
        <EventTemplatesEditor initial={res.data} />
      ) : (
        <Card>
          <CardContent className="pt-5 text-sm text-status-danger-fg">{res.error}</CardContent>
        </Card>
      )}
    </div>
  );
}
