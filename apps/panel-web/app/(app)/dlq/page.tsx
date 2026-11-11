import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import type { Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import { avisoEnPalabras, llegadaDe } from "@/lib/fallidos";
import { formatDateTime } from "@/lib/format";
import { RetryButton } from "./_components/retry-button";
import { RetryDomainEventButton } from "./_components/retry-domain-event-button";

export const metadata = { title: "Mensajes fallidos" };

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

const llegada = (e: DlqEntry) => {
  const fecha = llegadaDe(e.entry_id);
  return fecha ? formatDateTime(fecha) : "";
};

/**
 * Mensajes fallidos (CFG-08): lo que el asistente no pudo procesar tras sus reintentos, en palabras. Sin ids
 * de WhatsApp ni del negocio a la vista; los avisos del sistema (pagos, pedidos) con su nombre.
 */
export default async function DlqPage() {
  const [res, eventsRes] = await Promise.all([
    apiFetch<{ entries: DlqEntry[] }>("/admin/dlq"),
    apiFetch<{ entries: DomainEventEntry[] }>("/admin/domain-events"),
  ]);
  const cabecera = (
    <PageHeader
      title="Mensajes fallidos"
      description="Mensajes de clientes que el asistente no pudo procesar. Reintentar los vuelve a poner en la fila."
      helpSection="tools"
    />
  );
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        {cabecera}
        <ErrorDeCarga titulo="No pudimos cargar los mensajes fallidos" detalle={res.error} />
      </div>
    );
  }

  const columns: Column<DlqEntry>[] = [
    { key: "mensaje", header: "Mensaje", cell: (e) => <span className="text-headline">{e.content ? `«${e.content}»` : "Sin texto (audio, imagen o archivo)"}</span> },
    { key: "llego", header: "Llegó", cell: (e) => <span className="text-body">{llegada(e)}</span> },
    { key: "acciones", header: <span className="sr-only">Acciones</span>, align: "right", cell: (e) => <RetryButton entryId={e.entry_id} que={`el mensaje «${e.content.slice(0, 40)}»`} /> },
  ];

  const eventColumns: Column<DomainEventEntry>[] = [
    { key: "aviso", header: "Aviso", cell: (e) => <span className="text-headline">{avisoEnPalabras(e.topic)}</span> },
    { key: "cuando", header: "Cuándo", cell: (e) => <span className="text-body">{formatDateTime(e.created_at)}</span> },
    { key: "intentos", header: "Intentos", cell: (e) => <span className="text-body tabular-nums">{e.attempts}</span> },
    { key: "error", header: "Qué pasó", cell: (e) => <span className="text-xs text-text-soft">{e.last_error || "Sin detalle"}</span> },
    { key: "acciones", header: <span className="sr-only">Acciones</span>, align: "right", cell: (e) => <RetryDomainEventButton eventId={e.id} que={`el aviso ${avisoEnPalabras(e.topic)}`} /> },
  ];

  return (
    <div className="flex flex-col gap-8">
      {cabecera}
      <TablaResponsiva
        etiqueta="Mensajes de clientes"
        caption="Mensajes de clientes que no se procesaron"
        columns={columns}
        rows={res.data.entries}
        getRowKey={(e) => e.entry_id}
        emptyTitle="Todo llegó"
        emptyDescription="No hay mensajes de clientes por reintentar."
        filaCelular={(e) => ({
          titulo: e.content ? `«${e.content}»` : "Sin texto (audio, imagen o archivo)",
          detalle: llegada(e),
          accion: <RetryButton entryId={e.entry_id} que={`el mensaje «${e.content.slice(0, 40)}»`} />,
        })}
      />

      <section className="flex flex-col gap-3" aria-labelledby="avisos-del-sistema">
        <div>
          <h2 id="avisos-del-sistema" className="font-display text-sh-block text-headline">
            Avisos del sistema que no salieron
          </h2>
          <p className="text-sm text-body">Pagos, pedidos o suscripciones que no se pudieron registrar tras varios intentos.</p>
        </div>
        {eventsRes.ok ? (
          <TablaResponsiva
            etiqueta="Avisos del sistema"
            caption="Avisos del sistema que no salieron"
            columns={eventColumns}
            rows={eventsRes.data.entries}
            getRowKey={(e) => e.id}
            emptyTitle="Ningún aviso pendiente"
            emptyDescription="Cuando un aviso agote sus intentos aparecerá aquí."
            filaCelular={(e) => ({
              titulo: avisoEnPalabras(e.topic),
              detalle: `${formatDateTime(e.created_at)} · ${e.attempts} intentos`,
              accion: <RetryDomainEventButton eventId={e.id} que={`el aviso ${avisoEnPalabras(e.topic)}`} />,
            })}
          />
        ) : (
          <ErrorDeCarga titulo="No pudimos cargar los avisos del sistema" detalle={eventsRes.error} />
        )}
      </section>
    </div>
  );
}
