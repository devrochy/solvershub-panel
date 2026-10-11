import Link from "next/link";

import { CambiarNegocioAviso } from "@/app/(app)/calendario/_components/cambiar-negocio";
import { CancelAppointmentButton } from "@/app/(app)/calendario/_components/cancel-appointment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { negocioPedidoDistinto } from "@/lib/negocio-pedido";

export const metadata = { title: "Calendario" };

const GOOGLE_AVISO: Record<string, { tone: string; texto: string }> = {
  ok: { tone: "text-status-success-fg", texto: "Google Calendar conectado." },
  cancelado: { tone: "text-status-warning-fg", texto: "Cancelaste la autorización de Google." },
  error: { tone: "text-status-danger-fg", texto: "No se pudo completar la conexión con Google." },
  otro_negocio: {
    tone: "text-status-danger-fg",
    texto:
      "No se conectó: cambiaste de negocio mientras autorizabas en Google. Vuelve a conectar desde el negocio correcto.",
  },
  not_configured: {
    tone: "text-status-warning-fg",
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
  // `tenant`: la app abre `/calendario?tenant=<id>` con el negocio en el que está el dueño.
  searchParams: Promise<{ google?: string; tenant?: string }>;
}) {
  const { google, tenant } = await searchParams;
  const avisoGoogle = google ? GOOGLE_AVISO[google] : undefined;
  const [statusRes, appointmentsRes, meRes] = await Promise.all([
    apiFetch<Status>("/pack/calendar/status"),
    apiFetch<Appointment[]>("/pack/calendar/appointments"),
    apiFetch<Me>("/admin/me"),
  ]);
  const activo = meRes.ok ? meRes.data.tenant : null;
  const negocioPedido = negocioPedidoDistinto(tenant, activo?.id);
  if (!statusRes.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
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

      {negocioPedido && <CambiarNegocioAviso tenantId={negocioPedido} actual={activo?.name ?? null} />}

      <PageHeader
        title="Calendario"
        description="Conexión con Google Calendar, tipos de cita y agenda del negocio (habilidad Calendario)."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/calendario/tipos">Tipos de cita</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/calendario/horario">Configurar horario</Link>
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
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/habilidades/pack_calendar">Configurar credenciales</Link>
            </Button>
            {negocioPedido ? (
              // Con otro negocio pedido por la app, conectar guardaría la cuenta en el activo.
              <Button variant="ghost" size="sm" disabled>
                Conectar con Google ↗
              </Button>
            ) : (
              <Button asChild variant="ghost" size="sm">
                {/* `<a>` y no `<Link>`: el prefetch de Next llamaba al inicio del OAuth en cada
                    carga y cada llamada renovaba el `state`, así que el retorno de Google no
                    coincidía (HU-CAL-07). */}
                <a href="/api/calendar/oauth?next=/calendario">Conectar con Google ↗</a>
              </Button>
            )}
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
