import Link from "next/link";

import { MenuPlantilla, SyncTemplatesButton } from "@/app/(app)/conexiones/_components/meta/plantillas/template-actions";
import { NewTemplateDialog } from "@/app/(app)/conexiones/_components/meta/plantillas/new-template-dialog";
import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { Badge } from "@/components/ui/badge";
import { type Column } from "@/components/ui/data-table";
import { apiFetch } from "@/lib/api/server";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";
import {
  calidadNumeroLabel,
  categoriaPlantillaMetaLabel,
  estadoPlantillaMetaLabel,
  idiomaLabel,
  rechazoPlantillaMetaLabel,
} from "@/lib/labels";

export const metadata = { title: "Plantillas" };

type TemplateItem = {
  id: string;
  name: string;
  language: string;
  category: string | null;
  status: string;
  quality_score: string | null;
  rejected_reason: string | null;
};

const TONO_ESTADO: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  APPROVED: "success",
  PENDING: "warning",
  IN_APPEAL: "warning",
  PAUSED: "warning",
  REJECTED: "danger",
  DISABLED: "danger",
};

/**
 * Plantillas de WhatsApp de la cuenta (rediseñada en CON-12): estado, categoría e idioma en
 * palabras, el motivo de un rechazo debajo y Eliminar en el menú de la fila. «Traer de Meta» es
 * secundaria; la acción principal es crear una.
 */
export default async function TemplatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await fichaDePestana(id, "plantillas");
  const connectionId = ficha?.conexion.meta_connection_id;
  if (!connectionId) return null;
  const puedeEditar = ficha.consola.can_edit;
  const res = await apiFetch<{
    templates: TemplateItem[];
    sync_error: string | null;
    at_limit: boolean;
  }>(`/admin/meta/connections/${connectionId}/templates`);
  if (!res.ok) {
    return (
      <SeccionFicha titulo="Plantillas">
        <ErrorDeCarga titulo="No se pudieron cargar las plantillas" detalle={res.error} />
      </SeccionFicha>
    );
  }
  const { templates, sync_error, at_limit } = res.data;

  const estado = (t: TemplateItem) => (
    <div className="flex flex-col items-start gap-1">
      <Badge variant={TONO_ESTADO[t.status] ?? "neutral"}>{estadoPlantillaMetaLabel(t.status)}</Badge>
      {rechazoPlantillaMetaLabel(t.rejected_reason) && (
        <span className="text-xs text-status-danger-fg">{rechazoPlantillaMetaLabel(t.rejected_reason)}</span>
      )}
    </div>
  );
  const menu = (t: TemplateItem) =>
    puedeEditar ? <MenuPlantilla connectionId={connectionId} templateId={t.id} nombre={t.name} /> : null;

  const columns: Column<TemplateItem>[] = [
    { key: "nombre", header: "Plantilla", cell: (t) => <span className="font-medium text-headline">{t.name}</span> },
    { key: "estado", header: "Estado", cell: estado },
    { key: "categoria", header: "Categoría", cell: (t) => <span className="text-body">{categoriaPlantillaMetaLabel(t.category)}</span> },
    { key: "idioma", header: "Idioma", cell: (t) => <span className="text-body">{idiomaLabel(t.language)}</span> },
    {
      key: "calidad",
      header: "Calidad",
      info: "Cómo califica Meta la plantilla según cómo responden tus clientes.",
      className: "max-lg:hidden",
      cell: (t) => <span className="text-body">{t.quality_score ? calidadNumeroLabel(t.quality_score) : "—"}</span>,
    },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      className: "w-10",
      cell: menu,
    },
  ];

  return (
    <SeccionFicha
      titulo="Plantillas"
      descripcion={
        <>
          Los mensajes que Meta aprueba para escribirle a un cliente fuera de la conversación. Los que se envían solos
          están en <Link className="text-link underline-offset-4 hover:underline" href="/plantillas/eventos">Avisos por evento</Link> y{" "}
          <Link className="text-link underline-offset-4 hover:underline" href="/plantillas-opciones">Plantillas con opciones</Link>.
        </>
      }
      acciones={
        <>
          <SyncTemplatesButton connectionId={connectionId} />
          {puedeEditar && <NewTemplateDialog connectionId={connectionId} />}
        </>
      }
    >
      {(sync_error || at_limit) && (
        <div role="status" className="rounded-md border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-headline">
          {at_limit && <p>La cuenta llegó al máximo de plantillas que permite Meta. Elimina las que ya no uses.</p>}
          {sync_error && <p>Meta respondió con un aviso al traerlas: {sync_error}</p>}
        </div>
      )}

      <TablaResponsiva
        etiqueta="Plantillas de WhatsApp"
        columns={columns}
        rows={templates}
        getRowKey={(t) => t.id}
        emptyTitle="Todavía no hay plantillas"
        emptyDescription="Crea la primera o tráelas de Meta si ya las tienes en WhatsApp Manager."
        filaCelular={(t) => ({
          titulo: t.name,
          detalle: `${estadoPlantillaMetaLabel(t.status)} · ${categoriaPlantillaMetaLabel(t.category)} · ${idiomaLabel(t.language)}${rechazoPlantillaMetaLabel(t.rejected_reason) ? ` · ${rechazoPlantillaMetaLabel(t.rejected_reason)}` : ""}`,
          accion: menu(t),
        })}
      />
    </SeccionFicha>
  );
}
