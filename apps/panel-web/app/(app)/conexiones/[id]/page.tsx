import Link from "next/link";
import { notFound } from "next/navigation";

import { FormularioAgenda } from "@/app/(app)/calendario/_components/formulario-agenda";
import { ConnectionActions } from "@/app/(app)/conexiones/_components/connection-actions";
import { AvisoGoogle } from "@/components/domain/aviso-google";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { ConnectionsResponse, ListaDeAgendas, Me } from "@/lib/api/types";

export const metadata = { title: "Google Calendar" };

/**
 * Ficha de una cuenta de Google Calendar (HU-CAL-08, alcance mínimo de HU-UX-09): antes era la
 * pestaña «Google Calendar» de Agenda. Una conexión = una agenda: aquí se ve la cuenta, se
 * reconecta o se desconecta, y se edita la agenda que el asistente le ofrece al cliente.
 */
export default async function FichaGoogleCalendar({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ google?: string }>;
}) {
  const [{ id }, { google }] = await Promise.all([params, searchParams]);
  const [conexionesRes, agendasRes, meRes] = await Promise.all([
    apiFetch<ConnectionsResponse>("/admin/connections"),
    apiFetch<ListaDeAgendas>("/pack/calendar/calendars"),
    apiFetch<Me>("/admin/me"),
  ]);
  if (!conexionesRes.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar la conexión: {conexionesRes.error}
      </p>
    );
  }
  const conexion = conexionesRes.data.items.find((c) => c.id === id && c.type_id === "google_calendar");
  if (!conexion) notFound();

  const agenda = agendasRes.ok ? agendasRes.data.calendars.find((a) => a.connection_id === id) : undefined;
  const permisos = meRes.ok ? meRes.data.permissions : {};
  const puedeEditarConexion = permisos.connections === "write";
  const puedeEditarAgenda = permisos["pack_calendar:configuracion"] === "write";
  const correo = agenda?.account_email || conexion.external_id;

  return (
    <div className="flex flex-col gap-6">
      <AvisoGoogle codigo={google} />
      <PageHeader
        title={conexion.label || "Google Calendar"}
        description="Cuenta de Google Calendar conectada. Cada cuenta es una agenda del módulo de Agenda."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/calendario">Ver la Agenda</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Cuenta</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={conexion.active ? "success" : "neutral"}>{conexion.active ? "Conectada" : "Pausada"}</Badge>
              {conexion.is_primary && <Badge variant="accent">Principal</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4 text-sm">
          {correo && (
            <span className="text-body">
              Cuenta: <span className="text-headline">{correo}</span>
            </span>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/habilidades/pack_calendar">Credenciales de Google</Link>
            </Button>
            {puedeEditarConexion && (
              <>
                <Button asChild variant="outline" size="sm">
                  {/* `<a>` y no `<Link>`: el inicio del OAuth no se pre-carga (HU-CAL-07). */}
                  <a href={`/api/calendar/oauth?connection_id=${id}&next=${encodeURIComponent(`/conexiones/${id}`)}`}>
                    Reconectar ↗
                  </a>
                </Button>
                <ConnectionActions
                  connectionId={conexion.id}
                  label={conexion.label}
                  active={conexion.active}
                  primary={conexion.is_primary}
                  kind="channel_connection"
                  typeId={conexion.type_id}
                  trigger="button"
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agenda</CardTitle>
          <p className="text-sm text-body">
            El nombre es el que el asistente le dice al cliente. La descripción y los alias le ayudan a recomendar esta agenda
            según lo que pide.
          </p>
        </CardHeader>
        <CardContent>
          {agenda ? (
            <FormularioAgenda agenda={agenda} idBase="ficha" soloLectura={!puedeEditarAgenda} />
          ) : (
            <p className="text-sm text-body">
              Esta cuenta todavía no tiene una agenda. Se crea sola al reconectarla; también puedes abrir los ajustes de la{" "}
              <Link href="/calendario?ajustes=agendas" className="text-link underline-offset-2 hover:underline">
                Agenda
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
