import Link from "next/link";

import { ConnectionActions } from "@/app/(app)/conexiones/_components/connection-actions";
import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { InstagramCuentas } from "@/app/(app)/conexiones/instagram/_components/instagram-cuentas";
import { AvisoGoogle } from "@/components/domain/aviso-google";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/server";
import type { ListaDeAgendas, Me } from "@/lib/api/types";
import { estadoDeConexion } from "@/lib/conexion-ficha";
import { fichaDePestana, type FichaCargada } from "@/lib/conexion-ficha-servidor";
import { resumenConsumo } from "@/lib/conexiones";
import type { CuentaDeInstagram } from "@/lib/instagram-alta";

export const metadata = { title: "Cuenta" };

/**
 * Cuenta de la conexión: Google Calendar (HU-CAL-08: estado, correo, reconectar, pausar o
 * desconectar), Instagram (la cuenta con su prueba de mensajes) o Messenger (la Página).
 */
export default async function CuentaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ google?: string }>;
}) {
  const [{ id }, { google }] = await Promise.all([params, searchParams]);
  const ficha = await fichaDePestana(id, "cuenta");
  if (!ficha) return null;
  if (ficha.tipo === "google_calendar") return <CuentaGoogle ficha={ficha} aviso={google} />;
  return <CuentaMeta ficha={ficha} />;
}

async function CuentaGoogle({ ficha, aviso }: { ficha: FichaCargada; aviso?: string }) {
  const c = ficha.conexion;
  const [agendasRes, meRes] = await Promise.all([
    apiFetch<ListaDeAgendas>("/pack/calendar/calendars"),
    apiFetch<Me>("/admin/me"),
  ]);
  const agenda = agendasRes.ok ? agendasRes.data.calendars.find((a) => a.connection_id === c.id) : undefined;
  const puedeEditar = meRes.ok && meRes.data.permissions.connections === "write";
  const correo = agenda?.account_email || c.external_id;
  const vuelta = encodeURIComponent(`/conexiones/${c.id}/cuenta`);

  return (
    <SeccionFicha
      titulo="Cuenta"
      descripcion="Cuenta de Google Calendar conectada. Cada cuenta es una agenda del módulo de Agenda."
      acciones={
        <Button asChild variant="outline" size="sm">
          <Link href="/calendario">Ver la Agenda</Link>
        </Button>
      }
    >
      <AvisoGoogle codigo={aviso} />
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Google Calendar</CardTitle>
            <Badge variant={c.active ? "success" : "neutral"}>{c.active ? "Conectada" : "Pausada"}</Badge>
            {c.is_primary && <Badge variant="accent">Principal</Badge>}
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
            {puedeEditar && (
              <>
                <Button asChild variant="outline" size="sm">
                  {/* `<a>` y no `<Link>`: el inicio del OAuth no se pre-carga (HU-CAL-07). */}
                  <a href={`/api/calendar/oauth?connection_id=${c.id}&next=${vuelta}`}>Reconectar ↗</a>
                </Button>
                <ConnectionActions
                  connectionId={c.id}
                  label={c.label}
                  active={c.active}
                  primary={c.is_primary}
                  kind="channel_connection"
                  typeId={c.type_id}
                  trigger="button"
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </SeccionFicha>
  );
}

async function CuentaMeta({ ficha }: { ficha: FichaCargada }) {
  const c = ficha.conexion;
  const instagram = ficha.tipo === "instagram";
  const cuentasRes = instagram
    ? await apiFetch<{ accounts: CuentaDeInstagram[] }>("/admin/meta/instagram/accounts")
    : null;
  const cuentas = cuentasRes?.ok ? cuentasRes.data.accounts : [];
  // La conexión guarda el id de la cuenta de Instagram; si no coincide, se muestran todas.
  const propias = cuentas.filter((x) => x.ig_user_id === c.external_id);
  const estado = estadoDeConexion(c);
  const gestion = instagram ? "/conexiones/instagram" : "/conexiones/messenger";

  return (
    <SeccionFicha
      titulo="Cuenta"
      descripcion={
        instagram
          ? "La cuenta profesional de Instagram que atiende tu asistente."
          : "La Página de Facebook cuyos mensajes atiende tu asistente."
      }
      acciones={
        <Button asChild variant="outline" size="sm">
          <Link href={gestion}>{instagram ? "Conectar otra cuenta" : "Gestionar Páginas"}</Link>
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{c.label}</CardTitle>
            <Badge variant={estado.tono}>{estado.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4 text-sm text-body">
          <span>
            {instagram ? "Id de la cuenta" : "Id de la Página"}:{" "}
            <span className="font-mono text-xs text-headline">{c.external_id || "—"}</span>
          </span>
          <span>7 días: {resumenConsumo(c.usage_7d)}</span>
          {ficha.consola.can_edit && (
            <span className="ml-auto">
              <ConnectionActions
                connectionId={c.id}
                label={c.label}
                active={c.active}
                primary={c.is_primary}
                kind={c.meta_connection_id ? "meta_connection" : "channel_connection"}
                typeId={c.type_id}
                trigger="button"
              />
            </span>
          )}
        </CardContent>
      </Card>
      {cuentasRes && !cuentasRes.ok && (
        <p role="alert" className="text-status-danger-fg">
          No se pudieron cargar tus cuentas de Instagram: {cuentasRes.error}
        </p>
      )}
      {instagram && <InstagramCuentas cuentas={propias.length > 0 ? propias : cuentas} />}
    </SeccionFicha>
  );
}
