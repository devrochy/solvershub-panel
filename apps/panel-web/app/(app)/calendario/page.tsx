import Link from "next/link";

import { CambiarNegocioAviso } from "@/app/(app)/calendario/_components/cambiar-negocio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";
import { negocioPedidoDistinto } from "@/lib/negocio-pedido";

export const metadata = { title: "Google Calendar" };

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

export default async function CalendarPage({
  searchParams,
}: {
  // `tenant`: la app abre `/calendario?tenant=<id>` con el negocio en el que está el dueño.
  searchParams: Promise<{ google?: string; tenant?: string }>;
}) {
  const { google, tenant } = await searchParams;
  const avisoGoogle = google ? GOOGLE_AVISO[google] : undefined;
  const [statusRes, meRes] = await Promise.all([
    apiFetch<Status>("/pack/calendar/status"),
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

  return (
    <div className="flex flex-col gap-6">
      {avisoGoogle && (
        <p role="status" className={avisoGoogle.tone}>
          {avisoGoogle.texto}
        </p>
      )}

      {negocioPedido && <CambiarNegocioAviso tenantId={negocioPedido} actual={activo?.name ?? null} />}

      {/* HU-UX-08: las citas se ven en la pestaña Calendario; aquí solo queda la conexión, que
          pasa a la ficha de conexión con HU-UX-09. */}
      <PageHeader
        title="Google Calendar"
        description="Conecta la agenda con Google Calendar. Las citas se ven en la pestaña Calendario."
        actions={
          <Button asChild variant="outline">
            <Link href="/calendario/citas">Ver el calendario</Link>
          </Button>
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

    </div>
  );
}
