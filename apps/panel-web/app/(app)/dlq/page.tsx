import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import { RetryButton } from "./_components/retry-button";

export const metadata = { title: "Bandeja de fallos" };

type DlqEntry = {
  entry_id: string;
  external_message_id: string;
  tenant_id: string;
  content: string;
};

export default async function DlqPage() {
  const res = await apiFetch<{ entries: DlqEntry[] }>("/admin/dlq");
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudo cargar la bandeja de fallos: {res.error}
      </p>
    );
  }

  const columns: Column<DlqEntry>[] = [
    {
      key: "mensaje",
      header: "Mensaje",
      cell: (e) => <span className="font-mono text-xs text-body">{e.external_message_id || "—"}</span>,
    },
    {
      key: "negocio",
      header: "Negocio",
      cell: (e) => <span className="font-mono text-xs text-body">{e.tenant_id.slice(0, 8)}</span>,
    },
    { key: "contenido", header: "Contenido", cell: (e) => <span className="text-body">{e.content || "—"}</span> },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (e) => <RetryButton entryId={e.entry_id} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bandeja de fallos"
        description="Mensajes que fallaron tras varios reintentos. Reintentar los devuelve a la cola de entrada."
      />
      <DataTable
        columns={columns}
        rows={res.data.entries}
        getRowKey={(e) => e.entry_id}
        emptyTitle="Sin mensajes fallidos"
        emptyDescription="Cuando un mensaje agote sus reintentos aparecerá aquí."
      />
    </div>
  );
}
