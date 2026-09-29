import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import { formatDateTime } from "@/lib/format";
import { AppointmentDialog } from "./_components/appointment-dialog";
import { CancelAppointmentButton } from "./_components/cancel-button";

export const metadata = { title: "Citas" };

type Appointment = {
  id: string;
  title: string;
  attendee_email: string | null;
  start_at: string;
  end_at: string;
  status: string;
  notes: string;
  google_event_id: string | null;
};
type Tipo = { id: string; name: string; duration_minutes?: number | null };

const ESTADO_TONE: Record<string, "success" | "neutral" | "danger"> = {
  scheduled: "success",
  cancelled: "danger",
  completed: "neutral",
};

export default async function CitasPage() {
  const [res, tiposRes] = await Promise.all([
    apiFetch<Appointment[]>("/pack/calendar/appointments"),
    apiFetch<Tipo[]>("/pack/calendar/types"),
  ]);
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar las citas: {res.error}
      </p>
    );
  }
  const tipos = tiposRes.ok ? tiposRes.data : [];

  const columns: Column<Appointment>[] = [
    { key: "titulo", header: "Cita", cell: (c) => <span className="text-headline">{c.title}</span> },
    { key: "inicio", header: "Inicio", cell: (c) => formatDateTime(c.start_at) },
    { key: "fin", header: "Fin", cell: (c) => formatDateTime(c.end_at) },
    {
      key: "asistente",
      header: "Asistente",
      cell: (c) => <span className="text-body">{c.attendee_email ?? "—"}</span>,
    },
    {
      key: "google",
      header: "Google",
      cell: (c) =>
        c.google_event_id ? <Badge variant="success">evento</Badge> : <Badge variant="neutral">local</Badge>,
    },
    {
      key: "estado",
      header: "Estado",
      cell: (c) => <Badge variant={ESTADO_TONE[c.status] ?? "neutral"}>{c.status}</Badge>,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (c) => (c.status === "scheduled" ? <CancelAppointmentButton id={c.id} /> : <span className="text-xs text-body">—</span>),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Citas"
        description="Agenda del negocio: citas locales o espejadas en Google Calendar."
        actions={<AppointmentDialog tipos={tipos} />}
      />
      <DataTable
        columns={columns}
        rows={res.data}
        getRowKey={(c) => c.id}
        emptyTitle="Sin citas"
        emptyDescription="Agenda la primera con «Nueva cita»."
      />
    </div>
  );
}
