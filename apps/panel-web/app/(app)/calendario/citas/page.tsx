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
type WeekItem = {
  kind: "appointment" | "block";
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  status: string;
  source: "local" | "google";
};
type WeekOut = {
  start: string;
  days: { date: string; weekday: number; business_hours: string }[];
  items: WeekItem[];
};

const ESTADO_TONE: Record<string, "success" | "neutral" | "danger"> = {
  scheduled: "success",
  cancelled: "danger",
  completed: "neutral",
};

const NOMBRE_DIA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function hora(iso: string): string {
  return iso.slice(11, 16);
}

export default async function CitasPage() {
  const [res, tiposRes, weekRes] = await Promise.all([
    apiFetch<Appointment[]>("/pack/calendar/appointments"),
    apiFetch<Tipo[]>("/pack/calendar/types"),
    apiFetch<WeekOut>("/pack/calendar/week"),
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

      {weekRes.ok && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold text-headline">
            Esta semana ({weekRes.data.start})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {weekRes.data.days.map((dia) => {
              const items = weekRes.data.items.filter((i) => i.start_at.slice(0, 10) === dia.date);
              return (
                <div key={dia.date} className="flex flex-col gap-2 rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-headline">
                      {NOMBRE_DIA[dia.weekday]} {dia.date.slice(8)}
                    </span>
                    <span className="text-xs text-body">{dia.business_hours || "cerrado"}</span>
                  </div>
                  {items.length === 0 ? (
                    <span className="text-xs text-text-soft">—</span>
                  ) : (
                    items.map((item) => (
                      <div key={`${item.kind}-${item.id}`} className="flex flex-col gap-0.5">
                        <span className="text-xs text-body">
                          {hora(item.start_at)} · {item.title}
                        </span>
                        <Badge variant={item.kind === "block" ? "warning" : "accent"}>
                          {item.kind === "block" ? "bloqueo" : item.source}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
