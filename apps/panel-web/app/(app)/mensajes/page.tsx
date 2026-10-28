import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { CatalogoDeMensajes } from "@/lib/api/types";

import { CatalogoMensajes } from "./_components/catalogo-mensajes";

export const metadata = { title: "Mensajes" };

const DESCRIPCION =
  "Todo lo que tu asistente le escribe a un cliente, en un solo lugar: plantillas de WhatsApp, avisos por evento, mensajes con botones y los textos de tus habilidades. Aquí solo se consulta; cada mensaje se edita donde siempre.";

/** Catálogo unificado de mensajes (ADR-0178, pista D0): solo lectura, enlaza a los editores actuales. */
export default async function MensajesPage() {
  const res = await apiFetch<CatalogoDeMensajes>("/mensajes/catalogo");

  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Mensajes" description={DESCRIPCION} />
        <Card>
          <CardContent role="alert" className="pt-5 text-sm text-status-danger-fg">
            {res.status === 403
              ? "Tu rol no tiene acceso a ninguna de las secciones donde viven los mensajes."
              : `No se pudo cargar el catálogo de mensajes: ${res.error}`}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Mensajes" description={DESCRIPCION} />
      <CatalogoMensajes catalogo={res.data} />
    </div>
  );
}
