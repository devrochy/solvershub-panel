import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import { formatDateTime } from "@/lib/format";

import { BlockForm, DeleteBlockButton } from "./_components/block-actions";

export const metadata = { title: "Bloqueos de agenda" };

type Block = {
  id: string;
  start_at: string;
  end_at: string;
  reason: string;
};

type Status = { configured: boolean; connected: boolean; timezone: string };

export default async function CalendarBlocksPage() {
  const [res, statusRes] = await Promise.all([
    apiFetch<Block[]>("/pack/calendar/blocks?days=180"),
    apiFetch<Status>("/pack/calendar/status"),
  ]);
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar los bloqueos: {res.error}
      </p>
    );
  }

  const columns: Column<Block>[] = [
    {
      key: "inicio",
      header: "Inicio",
      cell: (b) => <span className="text-headline">{formatDateTime(b.start_at)}</span>,
    },
    { key: "fin", header: "Fin", cell: (b) => formatDateTime(b.end_at) },
    {
      key: "motivo",
      header: "Motivo",
      cell: (b) => <span className="text-body">{b.reason || "—"}</span>,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (b) => <DeleteBlockButton blockId={b.id} label={b.reason || formatDateTime(b.start_at)} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bloqueos de agenda"
        description="Días, franjas o el almuerzo en que el asistente NO debe agendar (agenda interna)."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/calendario">← Volver a Calendario</Link>
          </Button>
        }
      />

      {statusRes.ok && !statusRes.data.connected && !statusRes.data.configured && (
        <p role="status" className="text-warning">
          El Calendario no está configurado para este negocio. Los bloqueos aplican a la agenda
          interna.
        </p>
      )}

      <Card>
        <CardContent className="pt-5">
          <BlockForm />
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={res.data}
        getRowKey={(b) => b.id}
        emptyTitle="Sin bloqueos"
        emptyDescription="Crea uno para cerrar un día, unas vacaciones o el almuerzo."
      />
    </div>
  );
}
