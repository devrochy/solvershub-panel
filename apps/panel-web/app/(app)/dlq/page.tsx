import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import { RetryButton } from "./_components/retry-button";
import { RetryDomainEventButton } from "./_components/retry-domain-event-button";

export const metadata = { title: "Bandeja de fallos" };

type DlqEntry = {
  entry_id: string;
  external_message_id: string;
  tenant_id: string;
  content: string;
};

type DomainEventEntry = {
  id: string;
  topic: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
};

export default async function DlqPage() {
  const [res, eventsRes] = await Promise.all([
    apiFetch<{ entries: DlqEntry[] }>("/admin/dlq"),
    apiFetch<{ entries: DomainEventEntry[] }>("/admin/domain-events"),
  ]);
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
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

  const eventColumns: Column<DomainEventEntry>[] = [
    { key: "evento", header: "Evento", cell: (e) => <span className="font-mono text-xs text-body">{e.topic}</span> },
    {
      key: "intentos",
      header: "Intentos",
      cell: (e) => <span className="text-body">{e.attempts}</span>,
    },
    {
      key: "error",
      header: "Último error",
      cell: (e) => <span className="text-xs text-body">{e.last_error || "—"}</span>,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (e) => <RetryDomainEventButton eventId={e.id} />,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Bandeja de fallos"
        description="Mensajes que fallaron tras varios reintentos. Reintentar los devuelve a la cola de entrada."
        helpSection="tools"
      />
      <DataTable
        columns={columns}
        rows={res.data.entries}
        getRowKey={(e) => e.entry_id}
        emptyTitle="Sin mensajes fallidos"
        emptyDescription="Cuando un mensaje agote sus reintentos aparecerá aquí."
      />

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-headline">Eventos de dominio fallidos</h2>
          <p className="text-sm text-body">
            Eventos de pago/pedido/suscripción que agotaron sus reintentos. Reintentar los devuelve a la cola.
          </p>
        </div>
        <DataTable
          columns={eventColumns}
          rows={eventsRes.ok ? eventsRes.data.entries : []}
          getRowKey={(e) => e.id}
          emptyTitle="Sin eventos fallidos"
          emptyDescription="Cuando un evento agote sus reintentos aparecerá aquí."
        />
      </section>
    </div>
  );
}
