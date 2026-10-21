"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { LeadNote, TimelineItem, TimelineResponse } from "@/lib/api/types";
import { enlaceDeEvento, TIPO_DE_EVENTO } from "@/lib/clientes";
import { formatDateTime } from "@/lib/format";
import { useAction } from "@/lib/use-action";

/** Notas del equipo sobre el cliente (HU-CRM-04): las ve todo el equipo y el agente las tiene en cuenta. */
export function NotasDelCliente({ leadId, onCambio }: { leadId: string; onCambio?: () => void }) {
  const [notas, setNotas] = useState<LeadNote[] | null>(null);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const guardar = useAction({ refresh: false });
  const borrar = useAction({ refresh: false });

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/leads/${leadId}/notes`);
    if (res.ok) setNotas((await res.json()) as LeadNote[]);
    else setError("No se pudieron cargar las notas.");
  }, [leadId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: los setState ocurren después del await
    void cargar();
  }, [cargar]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio) return;
    const ok = await guardar.run(async () => {
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: limpio }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: res.ok, status: res.status, error: json.error, success: "Nota guardada." };
    });
    if (ok) {
      setTexto("");
      await cargar();
      onCambio?.();
    }
  }

  async function quitar(id: string) {
    const ok = await borrar.run(async () => {
      const res = await fetch(`/api/leads/${leadId}/notes/${id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: res.ok, status: res.status, error: json.error, success: "Nota borrada." };
    });
    if (ok) {
      await cargar();
      onCambio?.();
    }
  }

  return (
    <section aria-labelledby="ficha-notas" className="space-y-3">
      <h3 id="ficha-notas" className="text-sm font-semibold text-headline">
        Notas del equipo
      </h3>
      <form onSubmit={(e) => void agregar(e)} className="space-y-2">
        <Field
          label="Nueva nota"
          htmlFor="nota-nueva"
          help="La ve todo el equipo y el agente la tiene en cuenta. No anotes datos de salud, de pago ni contraseñas."
        >
          <Textarea
            id="nota-nueva"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={2000}
            rows={2}
            placeholder="Ej.: prefiere entregas en la tarde"
          />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" size="sm" loading={guardar.pending} disabled={!texto.trim()}>
            Guardar nota
          </Button>
        </div>
      </form>
      {error && <p className="text-sm text-status-danger-fg">{error}</p>}
      {notas && notas.length > 0 && (
        <ul className="space-y-2">
          {notas.map((n) => (
            <li key={n.id} className="rounded-md border border-border-soft p-3 text-sm">
              <p className="whitespace-pre-wrap break-words text-headline">{n.text}</p>
              <div className="mt-1 flex items-center justify-between gap-2 text-xs text-text-soft">
                <span>
                  {n.author} · {formatDateTime(n.created_at)}
                </span>
                {n.puede_borrar && (
                  <button
                    type="button"
                    className="text-link hover:underline"
                    onClick={() => void quitar(n.id)}
                    disabled={borrar.pending}
                  >
                    Borrar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Línea de tiempo del cliente (HU-CRM-04): lo más reciente primero, por páginas. */
export function HistoriaDelCliente({ leadId }: { leadId: string }) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [siguiente, setSiguiente] = useState<string | null>(null);
  const [parcial, setParcial] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(
    async (cursor?: string) => {
      setCargando(true);
      const res = await fetch(`/api/leads/${leadId}/timeline${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
      if (res.ok) {
        const pagina = (await res.json()) as TimelineResponse;
        setItems((prev) => (cursor ? [...prev, ...pagina.items] : pagina.items));
        setSiguiente(pagina.next_cursor ?? null);
        setParcial((p) => p || pagina.partial);
        setError(null);
      } else {
        setError("No se pudo cargar la historia.");
      }
      setCargando(false);
    },
    [leadId],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: los setState ocurren después del await
    void cargar();
  }, [cargar]);

  return (
    <section aria-labelledby="ficha-historia" className="space-y-3">
      <h3 id="ficha-historia" className="text-sm font-semibold text-headline">
        Historia
      </h3>
      {parcial && (
        <p className="text-xs text-status-warning-fg">Falta información de alguna habilidad; vuelve a abrir la ficha.</p>
      )}
      {error && <p className="text-sm text-status-danger-fg">{error}</p>}
      {!cargando && items.length === 0 && !error && <p className="text-sm text-body">Sin movimientos todavía.</p>}
      <ol className="relative space-y-3 border-l border-border-soft pl-4">
        {items.map((e, i) => {
          const href = enlaceDeEvento(e.link_kind, e.link_id);
          return (
            <li key={`${e.kind}-${e.at}-${i}`} className="text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="neutral">{TIPO_DE_EVENTO[e.kind] ?? e.kind}</Badge>
                <span className="text-xs text-text-soft">{formatDateTime(e.at)}</span>
              </div>
              <p className="mt-1 text-headline">
                {href ? (
                  <Link href={href} className="text-link hover:underline">
                    {e.title}
                  </Link>
                ) : (
                  e.title
                )}
              </p>
              {e.detail && <p className="break-words text-body">{e.detail}</p>}
            </li>
          );
        })}
      </ol>
      {siguiente && (
        <Button size="sm" variant="outline" loading={cargando} onClick={() => void cargar(siguiente)}>
          Ver más
        </Button>
      )}
    </section>
  );
}
