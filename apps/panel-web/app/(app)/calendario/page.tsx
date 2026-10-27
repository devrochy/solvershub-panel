import { CambiarNegocioAviso } from "@/app/(app)/calendario/_components/cambiar-negocio";
import { AvisoGoogle } from "@/components/domain/aviso-google";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/server";
import type { ListaDeAgendas, Me } from "@/lib/api/types";
import type { LeyendaAgenda } from "@/lib/calendario/agenda";
import { negocioPedidoDistinto } from "@/lib/negocio-pedido";
import Link from "next/link";

import { AgendaVista } from "./_components/agenda-vista";
import type { DatosAjustes } from "./_components/ajustes-sheet";
import type { Responsable } from "./_components/type-actions";
import type { Tipo } from "./_components/types";

export const metadata = { title: "Agenda" };

type Status = { timezone: string };
type TipoApi = Tipo & { description: string; duration_minutes: number; responsable_admin_id?: string | null; enlace_reunion?: string | null };

/**
 * Agenda en una sola vista (HU-CAL-08, sobre HU-UX-08): el calendario con las citas de todas
 * las agendas y un cajón de ajustes (tipos de cita, horario y agendas). La cuenta de Google
 * de cada agenda se administra en la ficha de su conexión.
 */
export default async function AgendaPage({
  searchParams,
}: {
  // `tenant`: la app abre `/calendario?tenant=<id>` con el negocio en el que está el dueño.
  searchParams: Promise<{ google?: string; tenant?: string; ajustes?: string }>;
}) {
  const { google, tenant, ajustes } = await searchParams;
  const [statusRes, meRes, tiposRes, agendasRes, colaboradoresRes, configRes] = await Promise.all([
    apiFetch<Status>("/pack/calendar/status"),
    apiFetch<Me>("/admin/me"),
    apiFetch<TipoApi[]>("/pack/calendar/types"),
    apiFetch<ListaDeAgendas>("/pack/calendar/calendars"),
    apiFetch<{ id: string; email: string; active: boolean }[]>("/admin/collaborators"),
    apiFetch<{ values: Record<string, unknown> }>("/admin/plugins/pack_calendar/config"),
  ]);
  const me = meRes.ok ? meRes.data : null;
  const activo = me?.tenant ?? null;
  const negocioPedido = negocioPedidoDistinto(tenant, activo?.id);

  // `/status` pide la sección de conexión; las agendas (y la zona horaria de cada una) solo la de citas.
  if (!agendasRes.ok) {
    return (
      <div className="flex flex-col gap-4">
        <AvisoGoogle codigo={google} />
        {agendasRes.status === 403 ? (
          <EmptyState
            title="Aún no tienes acceso a la Agenda"
            description="Pídele a un propietario del negocio el permiso de Agenda."
          />
        ) : (
          <p role="alert" className="text-status-danger-fg">
            No se pudo cargar la Agenda: {agendasRes.error}
          </p>
        )}
      </div>
    );
  }

  const permisos = me?.permissions ?? {};
  const tipos = tiposRes.ok ? tiposRes.data : null;
  const lista = agendasRes.data;
  const leyenda: LeyendaAgenda[] = lista.calendars.map((a) => ({
    id: a.id,
    name: a.name,
    color: a.color,
    is_default: a.is_default,
    active: a.active,
    disponible: a.connected,
  }));
  const datosAjustes: DatosAjustes = {
    tipos,
    responsables: colaboradoresRes.ok
      ? colaboradoresRes.data.filter((c) => c.active).map((c): Responsable => ({ id: c.id, email: c.email }))
      : [],
    horario: configRes.ok ? String(configRes.data.values?.business_hours ?? "") : null,
    agendas: lista,
    puedeEditarAgendas: permisos["pack_calendar:configuracion"] === "write",
    otroNegocio: Boolean(negocioPedido),
  };
  const sinAgendas = lista.calendars.length === 0;
  const zona = (statusRes.ok ? statusRes.data.timezone : "") || lista.calendars[0]?.timezone || "America/Bogota";

  return (
    <div className="flex flex-col gap-4">
      <AvisoGoogle codigo={google} />
      {negocioPedido && <CambiarNegocioAviso tenantId={negocioPedido} actual={activo?.name ?? null} />}

      <PageHeader
        title="Agenda"
        description="Elige un hueco para crear una cita o un bloqueo. Arrastra para mover y estira para cambiar la duración."
      />

      {sinAgendas && (
        <EmptyState
          title="Aún no hay agendas"
          description="Conecta una cuenta de Google Calendar o usa la agenda interna del negocio."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/calendario?ajustes=agendas">Configurar agendas</Link>
            </Button>
          }
        />
      )}

      <AgendaVista
        tenantId={activo?.id ?? "negocio"}
        tipos={(tipos ?? []).filter((t) => t.active !== false)}
        timezone={zona}
        agendas={leyenda}
        multiActivo={lista.multi_activo}
        ajustes={datosAjustes}
        seccionInicial={ajustes ?? null}
        puedeCrear={permisos["pack_calendar:citas"] === "write"}
      />
    </div>
  );
}
