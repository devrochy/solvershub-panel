"use client";

import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { QaEvento } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { describirEvento } from "@/lib/qa/historial";

import { llamarQa } from "./api";

/**
 * Registro de una prueba (HU-QA-03): quién cambió qué y cuándo. El master ve el de todos; un
 * tester, el de su ejecución y los cambios del ciclo.
 */
export function Registro({ slug }: { slug: string }) {
  const [eventos, setEventos] = useState<QaEvento[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    void llamarQa<QaEvento[]>(`items/${slug}/history`).then((r) => {
      if (!vigente) return;
      if (r.ok) setEventos(r.data);
      else setError(r.error);
    });
    return () => {
      vigente = false;
    };
  }, [slug]);

  if (error) return <p role="alert" className="text-sm text-status-danger-fg">No se pudo cargar el registro: {error}</p>;
  if (!eventos) return <Skeleton lines={4} />;
  if (eventos.length === 0) {
    return <p className="text-sm text-body">Todavía no hay cambios en esta prueba durante el ciclo.</p>;
  }
  return (
    <ol className="flex flex-col divide-y divide-border-soft">
      {eventos.map((ev, i) => (
        <li key={`${ev.en}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2 text-sm">
          <span className="text-headline">{describirEvento(ev)}</span>
          <span className="text-xs text-text-soft">
            {ev.por || "Sistema"} · <time dateTime={ev.en ?? undefined}>{formatDateTime(ev.en)}</time>
          </span>
        </li>
      ))}
    </ol>
  );
}
