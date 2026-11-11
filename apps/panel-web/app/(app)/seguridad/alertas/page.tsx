import Link from "next/link";

import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { apiFetch } from "@/lib/api/server";
import { diaEnPalabras } from "@/lib/plataforma";
import {
  SEVERIDAD,
  VISTAS_DE_ALERTAS,
  fraseDeEvento,
  lineaDeEvento,
  type EventoAcceso,
  type PaginaDeEventos,
} from "@/lib/seguridad";

export const metadata = { title: "Historial de accesos" };

/** «Hoy», «Ayer» o «12 de oct.»: el día que agrupa las alertas. */
function diaDe(iso: string, ahora: Date): string {
  const fecha = new Date(iso);
  const dia = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  if (dia(fecha) === dia(ahora)) return "Hoy";
  const ayer = new Date(ahora.getTime() - 86400_000);
  if (dia(fecha) === dia(ayer)) return "Ayer";
  return diaEnPalabras(iso);
}

/** Qué se puede hacer con una alerta (SEG-08): revisar el equipo en Seguridad. */
function accionDe(e: EventoAcceso): { label: string; href: string } | null {
  if (e.tipo === "dispositivo_pendiente") return { label: "Revisar", href: "/seguridad" };
  if (e.tipo === "dispositivo_bloqueado_usado" || e.tipo === "dispositivo_compartido") {
    return { label: "Ver el equipo", href: "/seguridad?equipos=bloqueado" };
  }
  return null;
}

/**
 * Historial de accesos (SEG-07 a 09): cada alerta en una frase, agrupadas por día, con lo que se
 * puede hacer. Se llega desde «Ver todo» en Seguridad; quien solo ve alertas entra directo aquí.
 */
export default async function AlertasPage({ searchParams }: { searchParams: Promise<{ severidad?: string; cursor?: string }> }) {
  const { severidad: cruda, cursor } = await searchParams;
  const vista = VISTAS_DE_ALERTAS.find((v) => v.value === cruda) ?? VISTAS_DE_ALERTAS[0];

  const consulta = new URLSearchParams();
  if (vista.severidad) consulta.set("severidad", vista.severidad);
  if (cursor) consulta.set("cursor", cursor);
  const res = await apiFetch<PaginaDeEventos>(`/access/events${consulta.size ? `?${consulta}` : ""}`);
  const header = <PageHeader title="Historial de accesos" helpSection="seguridad" />;
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorDeCarga titulo="No pudimos cargar el historial" detalle={res.error} />
      </div>
    );
  }

  const ahora = new Date();
  const href = (v: string) => (v ? `/seguridad/alertas?severidad=${v}` : "/seguridad/alertas");
  const grupos: { dia: string; eventos: EventoAcceso[] }[] = [];
  for (const e of res.data.items) {
    const dia = diaDe(e.occurred_at, ahora);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.dia === dia) ultimo.eventos.push(e);
    else grupos.push({ dia, eventos: [e] });
  }

  return (
    <div className="flex flex-col gap-6">
      {header}
      <div className="max-sm:-mx-4 max-sm:w-[calc(100%+2rem)] max-sm:overflow-x-auto max-sm:px-4">
        <SegmentedControl
          label="Qué alertas ver"
          value={vista.value}
          options={VISTAS_DE_ALERTAS.map((v) => ({ value: v.value, label: v.label, href: href(v.value) }))}
          className="w-max"
        />
      </div>
      {grupos.length === 0 ? (
        <p className="rounded-lg border border-border-soft bg-surface p-6 text-sm text-text-soft">
          {vista.value ? "No hay alertas de este tipo." : "Cuando alguien entre desde un equipo nuevo o falle un acceso, aparecerá aquí."}
        </p>
      ) : (
        grupos.map((g) => (
          <section key={g.dia} aria-label={g.dia} className="flex flex-col gap-2">
            <h2 className="text-sh-label uppercase tracking-[0.06em] text-text-soft">{g.dia}</h2>
            <ol className="overflow-hidden rounded-lg border border-border-soft bg-surface">
              {g.eventos.map((e) => {
                const accion = accionDe(e);
                return (
                  <li key={e.id} className="flex flex-col gap-2 border-b border-border-soft px-5 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                      <span className="w-24 shrink-0">
                        <Badge variant={SEVERIDAD[e.severidad].tone}>{SEVERIDAD[e.severidad].label}</Badge>
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="break-words text-headline">{fraseDeEvento(e)}</span>
                        <span className="text-sm text-text-soft">{lineaDeEvento(e, ahora)}</span>
                      </div>
                    </div>
                    {accion && (
                      <Link href={accion.href} className="self-end text-sm font-medium text-link hover:underline sm:self-auto">
                        {accion.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}
      {(cursor || res.data.next_cursor) && (
        <div className="flex justify-end gap-4 text-sm">
          {cursor && (
            <Link href={href(vista.value)} className="text-link hover:underline">
              Volver al inicio
            </Link>
          )}
          {res.data.next_cursor && (
            <Link
              href={`${href(vista.value)}${vista.value ? "&" : "?"}cursor=${encodeURIComponent(res.data.next_cursor)}`}
              className="text-link hover:underline"
            >
              Ver alertas anteriores
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
