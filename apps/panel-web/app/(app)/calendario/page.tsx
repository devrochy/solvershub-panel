import Link from "next/link";

import { CancelAppointmentButton } from "@/app/(app)/calendario/_components/cancel-appointment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Calendario" };

const GOOGLE_AVISO: Record<string, { tone: string; texto: string }> = {
  ok: { tone: "text-success", texto: "Google Calendar conectado." },
  cancelado: { tone: "text-warning", texto: "Cancelaste la autorización de Google." },
  error: { tone: "text-danger", texto: "No se pudo completar la conexión con Google." },
  not_configured: {
    tone: "text-warning",
    texto: "Configura las credenciales de Google del pack antes de conectar.",
  },
};

type Status = {
  configured: boolean;
  connected: boolean;
  account_email: string;
  connection_label: string;
  timezone: string;
  default_duration_minutes: number;
};

type Appointment = {
  id: string;
  title: string;
  attendee_email: string | null;
  start_at: string;
  end_at: string;
  status: string;
  google_event_id: string | null;
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const google = (await searchParams).google;
  const avisoGoogle = google ? GOOGLE_AVISO[google] : undefined;
  const [statusRes, appointmentsRes] = await Promise.all([
    apiFetch<Status>("/pack/calendar/status"),
    apiFetch<Appointment[]>("/pack/calendar/appointments"),
  ]);
  if (!statusRes.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudo cargar Calendario: {statusRes.error}
      </p>
    );
  }
  const status = statusRes.data;
  const appointments = appointmentsRes.ok ? appointmentsRes.data : [];

  const columns: Column<Appointment>[] = [
    {
      key: "cita",
      header: "Cita",
      cell: (a) => (
        <div className="flex flex-col">
          <span className="text-headline">{a.title || "Cita"}</span>
          {a.attendee_email && <span className="text-xs text-text-soft">{a.attendee_email}</span>}
        </div>
      ),
    },
    {
      key: "inicio",
      header: "Inicio",
      cell: (a) => <span className="text-body">{formatDateTime(a.start_at)}</span>,
    },
    {
      key: "fin",
      header: "Fin",
      cell: (a) => <span className="text-body">{formatDateTime(a.end_at)}</span>,
    },
    {
      key: "estado",
      header: "Estado",
      cell: (a) => (
        <Badge variant={a.status === "scheduled" ? "success" : a.status === "cancelled" ? "danger" : "neutral"}>
          {a.status}
        </Badge>
      ),
    },
    {
      key: "google",
      header: "Google",
      cell: (a) =>
        a.google_event_id ? (
          <Badge variant="accent">sincronizada</Badge>
        ) : (
          <span className="text-xs text-text-soft">solo local</span>
        ),
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (a) =>
        a.status === "scheduled" ? (
          <CancelAppointmentButton appointmentId={a.id} label={a.title || a.id.slice(0, 8)} />
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {avisoGoogle && (
        <p role="status" className={avisoGoogle.tone}>
          {avisoGoogle.texto}
        </p>
      )}

      <PageHeader
        title="Calendario"
        description="Conexión con Google Calendar, tipos de cita y agenda del negocio (habilidad Calendario)."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/calendario/tipos">Tipos de cita</Link>
            </Button>
            <Button asChild variant="ghost">
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Estado de la conexión</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={status.configured ? "success" : "warning"}>
                {status.configured ? "Configurada" : "Sin configurar"}
              </Badge>
              <Badge variant={status.connected ? "success" : "neutral"}>
                {status.connected ? "Conectada" : "Sin conectar"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-body">
            Zona horaria: <span className="text-headline">{status.timezone}</span>
          </span>
          <span className="text-body">
            Duración por defecto:{" "}
            <span className="text-headline">{status.default_duration_minutes} min</span>
          </span>
          {status.account_email && (
            <span className="text-body">
              Cuenta: <span className="text-headline">{status.account_email}</span>
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/habilidades/pack_calendar">Configurar credenciales</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/api/calendar/oauth?next=/calendario">Conectar con Google ↗</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">Próximas citas (30 días)</h2>
        <DataTable
          columns={columns}
          rows={appointments}
          getRowKey={(a) => a.id}
          emptyTitle="Sin citas próximas"
          emptyDescription="Cuando el agente agende una cita, aparecerá aquí."
        />
      </section>
    </div>
  );
}
