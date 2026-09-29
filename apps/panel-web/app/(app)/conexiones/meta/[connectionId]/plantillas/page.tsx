import Link from "next/link";

import {
  DeleteTemplateButton,
  SyncTemplatesButton,
} from "@/app/(app)/conexiones/meta/[connectionId]/plantillas/_components/template-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import { NewTemplateDialog } from "./_components/new-template-dialog";

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

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "danger",
  PAUSED: "warning",
  DISABLED: "danger",
};

export default async function TemplatesPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;
  const res = await apiFetch<{
    templates: TemplateItem[];
    sync_error: string | null;
    at_limit: boolean;
  }>(`/admin/meta/connections/${connectionId}/templates`);
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar las plantillas: {res.error}
      </p>
    );
  }
  const { templates, sync_error, at_limit } = res.data;

  const columns: Column<TemplateItem>[] = [
    { key: "nombre", header: "Plantilla", cell: (t) => <span className="text-headline">{t.name}</span> },
    {
      key: "idioma",
      header: "Idioma",
      cell: (t) => <Badge variant="neutral">{t.language}</Badge>,
    },
    {
      key: "categoria",
      header: "Categoría",
      cell: (t) => <span className="text-body">{t.category ?? "—"}</span>,
    },
    {
      key: "estado",
      header: "Estado",
      cell: (t) => (
        <div className="flex flex-col gap-1">
          <Badge variant={STATUS_VARIANT[t.status] ?? "neutral"}>{t.status}</Badge>
          {t.rejected_reason && (
            <span className="text-xs text-danger">{t.rejected_reason}</span>
          )}
        </div>
      ),
    },
    {
      key: "calidad",
      header: "Calidad",
      cell: (t) => <span className="text-body">{t.quality_score ?? "—"}</span>,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (t) => (
        <DeleteTemplateButton
          connectionId={connectionId}
          templateId={t.id}
          label={`${t.name} · ${t.language}`}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/conexiones/meta">← Volver</Link>
      </Button>

      <PageHeader
        title="Plantillas"
        description="Plantillas de WhatsApp de la WABA, sincronizadas desde Meta."
        actions={<SyncTemplatesButton connectionId={connectionId} />}
      />

      {sync_error && (
        <p role="status" className="text-sm text-warning">
          Aviso al sincronizar con Meta: {sync_error}
        </p>
      )}
      {at_limit && (
        <p role="status" className="text-sm text-warning">
          La WABA alcanzó el límite de plantillas de Meta.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <NewTemplateDialog connectionId={connectionId} />
        <span className="text-sm text-body">
          La edición de una plantilla ya creada sigue en el panel clásico.
        </span>
      </div>

      <DataTable
        columns={columns}
        rows={templates}
        getRowKey={(t) => t.id}
        emptyTitle="Sin plantillas"
        emptyDescription="Sincroniza con Meta o crea la primera desde el panel clásico."
      />
    </div>
  );
}
