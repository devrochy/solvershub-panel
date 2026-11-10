import { MissingTemplatesBanner } from "@/components/domain/missing-templates-banner";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { MessageTemplatesSettings } from "@/lib/api/types";

import { EventTemplatesEditor } from "./_components/event-templates-editor";

export const metadata = { title: "Avisos por evento" };

export default async function PlantillasPorEventoPage() {
  const res = await apiFetch<MessageTemplatesSettings>("/admin/settings/message-templates");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Avisos por evento"
        description="Lo que le llega al cliente cuando pasa algo. Fuera de las 24 horas solo sale con una plantilla aprobada por Meta."
        breadcrumbs={[{ label: "Mensajes", href: "/mensajes" }, { label: "Avisos por evento" }]}
      />
      <MissingTemplatesBanner enLaPagina="eventos" />
      {res.ok ? <EventTemplatesEditor initial={res.data} /> : <ErrorDeCarga titulo="No pudimos cargar los avisos" detalle={res.error} />}
    </div>
  );
}
