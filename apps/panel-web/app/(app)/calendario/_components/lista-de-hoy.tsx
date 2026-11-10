"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { hoyEn, type LeyendaAgenda } from "@/lib/calendario/agenda";
import { desfaseEn } from "@/lib/calendario/zona-horaria";
import { mensajeAsistencia, puedeMarcarAsistencia } from "@/lib/citas";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

import { type CalendarEvent } from "./types";

const ESTADO: Record<string, { label: string; tono: "success" | "warning" | "neutral" }> = {
  asistio: { label: "Vino", tono: "success" },
  no_asistio: { label: "No vino", tono: "warning" },
  cancelled: { label: "Cancelada", tono: "neutral" },
};

/** «-05:00» para que el backend lea el día en la zona del negocio. */
function desfaseIso(zona: string): string {
  const min = desfaseEn(zona, Date.now());
  const signo = min < 0 ? "-" : "+";
  const abs = Math.abs(min);
  return `${signo}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/**
 * Las citas de hoy en una columna junto al calendario (AGE-00A con la lista de B): lo que ya pasó
 * con «¿Vino?» a un toque, lo que está pasando y lo que sigue. Una fila abre la cita en el panel.
 * Lee las mismas agendas que se ven en la grilla y se recarga cuando ella se recarga.
 */
export function ListaDeHoy({
  timezone,
  agendas,
  agendasVisibles,
  tiposPorId,
  recargar,
  onAbrir,
  onCambio,
}: {
  timezone: string;
  agendas: LeyendaAgenda[];
  agendasVisibles: string[] | null;
  tiposPorId: Record<string, string>;
  recargar: number;
  onAbrir: (evento: CalendarEvent) => void;
  /** Se marcó la asistencia: la grilla también tiene que recargar. */
  onCambio: () => void;
}) {
  const [citas, setCitas] = useState<CalendarEvent[] | null>(null);
  const [marcando, setMarcando] = useState<string | null>(null);
  // La hora con que se separa lo que pasó de lo que sigue: se toma al leer las citas y cada minuto.
  const [ahora, setAhora] = useState(0);

  useEffect(() => {
    const marcar = () => setAhora(Date.now());
    const reloj = window.setInterval(marcar, 60_000);
    return () => window.clearInterval(reloj);
  }, []);
  const ids = agendasVisibles?.join(",") ?? "";

  useEffect(() => {
    const hoy = hoyEn(timezone);
    const manana = new Date(`${hoy}T12:00:00Z`);
    manana.setUTCDate(manana.getUTCDate() + 1);
    const desfase = desfaseIso(timezone);
    const params = new URLSearchParams({
      start: `${hoy}T00:00:00${desfase}`,
      end: `${manana.toISOString().slice(0, 10)}T00:00:00${desfase}`,
    });
    if (ids) params.set("calendar_ids", ids);
    let vigente = true;
    void fetch(`/api/pack/calendar/events?${params.toString()}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ events: CalendarEvent[] }>) : { events: [] }))
      .then((data) => {
        if (!vigente) return;
        // Solo las que empiezan hoy en la zona del negocio, aunque el servidor mande de más.
        setCitas(data.events.filter((c) => hoyEn(timezone, new Date(c.start)) === hoy).sort((a, b) => a.start.localeCompare(b.start)));
        setAhora(Date.now());
      })
      .catch(() => vigente && setCitas([]));
    return () => {
      vigente = false;
    };
  }, [timezone, ids, recargar]);

  const hora = useMemo(() => new Intl.DateTimeFormat("es-CO", { timeZone: timezone, hour: "numeric", minute: "2-digit" }), [timezone]);
  const titulo = useMemo(
    () => new Intl.DateTimeFormat("es-CO", { timeZone: timezone, weekday: "long", day: "numeric" }).format(new Date()),
    [timezone],
  );
  const nombreDeAgenda = (id?: string) => agendas.find((a) => a.id === id)?.name;

  async function marcar(cita: CalendarEvent, asistio: boolean) {
    setMarcando(cita.id);
    const res = await fetch(`/api/pack/calendar/appointments/${cita.id.replace("appt-", "")}/asistencia`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asistio }),
    });
    setMarcando(null);
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(json.error ?? "No se pudo marcar la asistencia.");
      return;
    }
    toast.success(mensajeAsistencia(asistio));
    onCambio();
  }

  const grupos = [
    { titulo: "Ya pasó", citas: (citas ?? []).filter((c) => new Date(c.end).getTime() <= ahora) },
    { titulo: "Ahora", citas: (citas ?? []).filter((c) => new Date(c.start).getTime() <= ahora && new Date(c.end).getTime() > ahora) },
    { titulo: "Sigue", citas: (citas ?? []).filter((c) => new Date(c.start).getTime() > ahora) },
  ].filter((g) => g.citas.length > 0);
  const cuantas = (citas ?? []).filter((c) => c.kind === "appointment" && c.status !== "cancelled").length;

  return (
    <section aria-labelledby="hoy-titulo" className="flex flex-col overflow-hidden rounded-lg border border-border-soft bg-surface">
      <div className="flex items-baseline justify-between gap-2 px-4 py-3">
        <h2 id="hoy-titulo" className="font-display text-sh-block text-headline first-letter:uppercase">
          Hoy, {titulo}
        </h2>
        {citas && <span className="text-xs text-text-soft">{cuantas === 1 ? "1 cita" : `${cuantas} citas`}</span>}
      </div>
      {citas === null ? (
        <div role="status" className="flex flex-col gap-3 px-4 pb-4" aria-busy="true" aria-label="Cargando las citas de hoy">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-4/5" />
        </div>
      ) : grupos.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-text-soft">Hoy no hay citas.</p>
      ) : (
        grupos.map((g) => (
          <div key={g.titulo}>
            <p className="px-4 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.06em] text-text-soft">{g.titulo}</p>
            <ul>
              {g.citas.map((c) => {
                const bloqueo = c.kind === "block";
                const estado = ESTADO[c.status];
                const pendiente = !bloqueo && c.status === "scheduled" && puedeMarcarAsistencia(c);
                const detalle = [bloqueo ? "Bloqueo" : tiposPorId[c.appointment_type_id], nombreDeAgenda(c.calendar_id)].filter(Boolean).join(" · ");
                return (
                  <li key={c.id} className="border-t border-border-soft">
                    <div className={cn("flex items-center gap-3 px-4 py-2.5", g.titulo === "Ahora" && "bg-surface-raised")}>
                      <span className="w-[4.5rem] shrink-0 whitespace-nowrap text-sm tabular-nums text-text-muted">{hora.format(new Date(c.start))}</span>
                      <button
                        type="button"
                        onClick={() => onAbrir(c)}
                        className="flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-md text-left focus-visible:outline-2 focus-visible:outline-focus"
                      >
                        <span className={cn("truncate text-sm font-medium", bloqueo ? "text-text-muted" : "text-headline", c.status === "cancelled" && "line-through")}>
                          {c.title || (bloqueo ? "Bloqueo" : "Cita")}
                        </span>
                        {detalle && <span className="truncate text-xs text-text-soft">{detalle}</span>}
                      </button>
                      {estado && !pendiente && <Badge variant={estado.tono}>{estado.label}</Badge>}
                    </div>
                    {pendiente && (
                      <div className="flex gap-2 px-4 pb-3 pl-[6.25rem]">
                        <Button size="sm" variant="outline" disabled={marcando === c.id} onClick={() => void marcar(c, true)}>
                          Vino
                        </Button>
                        <Button size="sm" variant="ghost" disabled={marcando === c.id} onClick={() => void marcar(c, false)}>
                          No vino
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
