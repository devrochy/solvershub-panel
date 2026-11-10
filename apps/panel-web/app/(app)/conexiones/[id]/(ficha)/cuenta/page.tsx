import Link from "next/link";

import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { InstagramCuentas } from "@/app/(app)/conexiones/instagram/_components/instagram-cuentas";
import { AvisoGoogle } from "@/components/domain/aviso-google";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/server";
import type { ListaDeAgendas, Me } from "@/lib/api/types";
import { fichaDePestana, type FichaCargada } from "@/lib/conexion-ficha-servidor";
import { actividadDeLaSemana } from "@/lib/conexiones";
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
    <SeccionFicha titulo="Cuenta" descripcion="La cuenta de Google donde tu agente agenda las citas.">
      <AvisoGoogle codigo={aviso} />
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle as="h3">Google Calendar</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {puedeEditar && (
              <Button asChild variant="outline">
                {/* `<a>` y no `<Link>`: el inicio del OAuth no se pre-carga (HU-CAL-07). */}
                <a href={`/api/calendar/oauth?connection_id=${c.id}&next=${vuelta}`}>Reconectar</a>
              </Button>
            )}
            <Button asChild variant="ghost">
              <Link href="/calendario">Ver la Agenda</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
            <dt className="text-text-soft">Cuenta</dt>
            <dd className="text-body">{correo || "—"}</dd>
            {c.is_primary && (
              <>
                <dt className="text-text-soft">Uso</dt>
                <dd className="text-body">Es la agenda principal del negocio</dd>
              </>
            )}
            <dt className="text-text-soft">Credenciales</dt>
            <dd>
              <Link href="/habilidades/pack_calendar" className="text-link hover:underline">
                Las de la app de Google, en la habilidad Agenda
              </Link>
            </dd>
          </dl>
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
  const gestion = instagram ? "/conexiones/instagram" : "/conexiones/messenger";

  return (
    <SeccionFicha
      titulo="Cuenta"
      descripcion={`${instagram ? "La cuenta profesional de Instagram" : "La Página de Facebook"} que atiende tu agente. Últimos 7 días: ${actividadDeLaSemana(c.usage_7d).toLowerCase()}.`}
      acciones={
        <Button asChild variant="ghost">
          <Link href={gestion}>{instagram ? "Conectar otra cuenta" : "Conectar otra Página"}</Link>
        </Button>
      }
    >
      {cuentasRes && !cuentasRes.ok && (
        <ErrorDeCarga titulo="No se pudieron cargar tus cuentas de Instagram" detalle={cuentasRes.error} />
      )}
      {instagram ? (
        <InstagramCuentas cuentas={propias.length > 0 ? propias : cuentas} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle as="h3">{c.label}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-body">Tu agente responde los mensajes que le escriben a esta Página.</CardContent>
        </Card>
      )}
    </SeccionFicha>
  );
}
