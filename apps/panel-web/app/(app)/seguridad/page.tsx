import Link from "next/link";

import { AccionesDeDispositivo } from "@/app/(app)/seguridad/_components/acciones-de-dispositivo";
import { AltaManual } from "@/app/(app)/seguridad/_components/alta-manual";
import { PoliticaDeAcceso } from "@/app/(app)/seguridad/_components/politica-de-acceso";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { apiFetch } from "@/lib/api/server";
import type { CollaboratorItem, Me } from "@/lib/api/types";
import {
  ESTADO_DISPOSITIVO,
  SEVERIDAD,
  accionesDeDispositivo,
  contextoDeAcciones,
  equipoDelEvento,
  fraseDeEvento,
  lineaDeEvento,
  lineaDelEquipo,
  quienEs,
  rolDelDispositivo,
  type DispositivoAcceso,
  type EventoAcceso,
  type PaginaDeDispositivos,
  type PaginaDeEventos,
  type PoliticaAcceso,
} from "@/lib/seguridad";

export const metadata = { title: "Seguridad" };

const SIETE_DIAS_MS = 7 * 86400_000;
/** Una fila: en el celular el texto arriba y los botones debajo, para que no se aprieten. */
const FILA = "flex flex-col gap-3 border-b border-border-soft px-5 py-4 last:border-b-0 sm:flex-row sm:items-center";
const VISTAS = [
  { value: "", label: "Todos" },
  { value: "activo", label: "Activos" },
  { value: "bloqueado", label: "Bloqueados" },
] as const;

/** ¿Ve las alertas? El dueño, el master y el tester siempre; los demás con la sección `access_alerts`. */
function veAlertas(me: Me | null): boolean {
  if (!me) return false;
  if (me.role === "master" || me.role === "tester" || me.tenant?.role === "owner") return true;
  return Boolean(me.permissions?.access_alerts);
}

/**
 * Seguridad en una sola página (rediseño B, SEG-01 a 12): una frase, «Necesita atención» con los
 * equipos que esperan aprobación y las alertas críticas de la semana, los equipos y la actividad
 * reciente lado a lado, y la política de equipos nuevos en una línea. El historial completo de
 * alertas vive en `/seguridad/alertas`.
 */
export default async function SeguridadPage({ searchParams }: { searchParams: Promise<{ equipos?: string; cursor?: string }> }) {
  const sp = await searchParams;
  const vista = VISTAS.find((v) => v.value === sp.equipos)?.value ?? "";
  const consulta = new URLSearchParams();
  if (vista) consulta.set("estado", vista);
  if (sp.cursor) consulta.set("cursor", sp.cursor);

  const meRes = await apiFetch<Me>("/admin/me");
  const me = meRes.ok ? meRes.data : null;
  const conAlertas = veAlertas(me);
  const [equiposRes, pendientesRes, politicaRes, criticasRes, recientesRes] = await Promise.all([
    apiFetch<PaginaDeDispositivos>(`/access/devices${consulta.size ? `?${consulta}` : ""}`),
    apiFetch<PaginaDeDispositivos>("/access/devices?estado=pendiente"),
    apiFetch<PoliticaAcceso>("/access/policy"),
    conAlertas ? apiFetch<PaginaDeEventos>("/access/events?severidad=critico") : null,
    conAlertas ? apiFetch<PaginaDeEventos>("/access/events") : null,
  ]);
  const ctx = contextoDeAcciones(me);
  const cuentasRes = ctx.puedeEscribir ? await apiFetch<CollaboratorItem[]>("/admin/collaborators") : null;
  const cuentas = cuentasRes?.ok
    ? cuentasRes.data.filter((c) => c.active).map((c) => ({ id: c.id, email: c.email, nombre: c.nombre }))
    : [];
  const header = (
    <PageHeader
      title="Seguridad"
      helpSection="seguridad"
      actions={ctx.puedeEscribir ? <AltaManual cuentas={cuentas} /> : undefined}
    />
  );
  if (!equiposRes.ok) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorDeCarga titulo="No pudimos cargar los equipos" detalle={equiposRes.error} />
      </div>
    );
  }

  const ahora = new Date();
  // Los pendientes van en «Necesita atención»; la lista de equipos muestra el resto.
  const equipos = equiposRes.data.items.filter((d) => d.estado !== "pendiente");
  const pendientes = pendientesRes.ok ? pendientesRes.data.items : equiposRes.data.items.filter((d) => d.estado === "pendiente");
  const criticas = (criticasRes?.ok ? criticasRes.data.items : []).filter(
    (e) => ahora.getTime() - new Date(e.occurred_at).getTime() < SIETE_DIAS_MS,
  );
  const recientes = (recientesRes?.ok ? recientesRes.data.items : []).filter((e) => e.severidad !== "critico").slice(0, 6);
  const atencion = pendientes.length + criticas.length;
  const activos = equiposRes.data.items.filter((d) => d.estado === "activo").length;
  const hrefVista = (v: string) => (v ? `/seguridad?equipos=${v}` : "/seguridad");

  return (
    <div className="flex flex-col gap-6">
      {header}

      <p className="text-lg text-body">
        {!vista && !sp.cursor && !equiposRes.data.next_cursor && (
          <>{activos === 1 ? "1 equipo entra a la app. " : `${activos} equipos entran a la app. `}</>
        )}
        <strong className="text-headline">
          {atencion === 0
            ? "Nada necesita tu atención."
            : atencion === 1
              ? "1 cosa necesita tu atención."
              : `${atencion} cosas necesitan tu atención.`}
        </strong>
      </p>

      {atencion > 0 && (
        <section aria-labelledby="atencion" className="flex flex-col gap-3">
          <h2 id="atencion" className="text-sh-block font-display text-headline">
            Necesita atención
          </h2>
          <ul className="overflow-hidden rounded-lg border border-border-soft bg-surface">
            {criticas.map((e) => (
              <AlertaCritica key={e.id} evento={e} equipo={equipoDelEvento(e, equiposRes.data.items)} ahora={ahora} />
            ))}
            {pendientes.map((d) => (
              <li key={d.id} className={FILA}>
                <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                  <span className="w-20 shrink-0"><Badge variant="warning">Espera</Badge></span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium text-headline">{quienEs(d.cuenta)} quiere entrar</span>
                    <span className="text-sm text-text-soft">
                      {rolDelDispositivo(d)} · {lineaDelEquipo(d, ahora)}
                    </span>
                  </div>
                </div>
                <AccionesDeDispositivo dispositivo={d} acciones={accionesDeDispositivo(d, ctx)} atencion />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={conAlertas ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]" : "flex flex-col gap-6"}>
        <section aria-labelledby="equipos" className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="equipos" className="text-sh-block font-display text-headline">
              Equipos
            </h2>
            <SegmentedControl
              label="Qué equipos ver"
              value={vista}
              options={VISTAS.map((v) => ({ value: v.value, label: v.label, href: hrefVista(v.value) }))}
            />
          </div>
          {equipos.length === 0 ? (
            <p className="rounded-lg border border-border-soft bg-surface p-6 text-sm text-text-soft">
              {vista === "bloqueado"
                ? "Ningún equipo está bloqueado."
                : "Cuando alguien entre a la app desde un teléfono, su equipo aparecerá aquí."}
            </p>
          ) : (
            <ul aria-label="Equipos" className="overflow-hidden rounded-lg border border-border-soft bg-surface">
              {equipos.map((d) => (
                <FilaDeEquipo key={d.id} dispositivo={d} acciones={accionesDeDispositivo(d, ctx)} ahora={ahora} />
              ))}
            </ul>
          )}
          {(sp.cursor || equiposRes.data.next_cursor) && (
            <div className="flex justify-end gap-4 text-sm">
              {sp.cursor && (
                <Link href={hrefVista(vista)} className="text-link hover:underline">
                  Volver al inicio
                </Link>
              )}
              {equiposRes.data.next_cursor && (
                <Link
                  href={`${hrefVista(vista)}${vista ? "&" : "?"}cursor=${encodeURIComponent(equiposRes.data.next_cursor)}`}
                  className="text-link hover:underline"
                >
                  Ver más equipos
                </Link>
              )}
            </div>
          )}
        </section>

        {conAlertas && (
          <section aria-labelledby="actividad" className="flex min-w-0 flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="actividad" className="text-sh-block font-display text-headline">
                Actividad reciente
              </h2>
              <Link href="/seguridad/alertas" className="text-sm text-link hover:underline">
                Ver todo
              </Link>
            </div>
            {recientes.length === 0 ? (
              <p className="rounded-lg border border-border-soft bg-surface p-6 text-sm text-text-soft">
                Todo tranquilo: no hubo equipos nuevos ni intentos fallidos.
              </p>
            ) : (
              <ol aria-label="Actividad reciente" className="overflow-hidden rounded-lg border border-border-soft bg-surface">
                {recientes.map((e) => (
                  <li key={e.id} className="flex flex-col gap-0.5 border-b border-border-soft px-4 py-3 last:border-b-0">
                    <span className="text-sm text-headline">{fraseDeEvento(e)}</span>
                    <span className="text-xs text-text-soft">{lineaDeEvento(e, ahora)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
      </div>

      {politicaRes.ok && <PoliticaDeAcceso politica={politicaRes.data} puedeEditar={ctx.esDuenoOMaster} />}
    </div>
  );
}

function AlertaCritica({ evento: e, equipo, ahora }: { evento: EventoAcceso; equipo?: DispositivoAcceso; ahora: Date }) {
  return (
    <li className={FILA}>
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        <span className="w-20 shrink-0"><Badge variant={SEVERIDAD.critico.tone}>{SEVERIDAD.critico.label}</Badge></span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="break-words font-medium text-headline">{fraseDeEvento(e)}</span>
          <span className="text-sm text-text-soft">{lineaDeEvento(e, ahora)}</span>
        </div>
      </div>
      <Link
        href={equipo ? `#equipo-${equipo.id}` : "/seguridad?equipos=bloqueado"}
        className="inline-flex h-9 items-center self-end rounded-md border border-control-border px-3 text-sm font-medium text-headline hover:bg-hover sm:self-auto"
      >
        Ver el equipo
      </Link>
    </li>
  );
}

function FilaDeEquipo({
  dispositivo: d,
  acciones,
  ahora,
}: {
  dispositivo: DispositivoAcceso;
  acciones: ReturnType<typeof accionesDeDispositivo>;
  ahora: Date;
}) {
  const estado = ESTADO_DISPOSITIVO[d.estado];
  return (
    <li id={`equipo-${d.id}`} className={`${FILA} scroll-mt-24 target:bg-hover`}>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="break-words font-medium text-headline">
          {quienEs(d.cuenta)}
          <span className="font-normal text-text-soft"> · {rolDelDispositivo(d)}</span>
        </span>
        <span className="text-sm text-text-soft">{lineaDelEquipo(d, ahora)}</span>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <Badge variant={estado.tone}>{estado.label}</Badge>
        <AccionesDeDispositivo dispositivo={d} acciones={acciones} />
      </div>
    </li>
  );
}
