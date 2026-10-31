"use client";

import { useEffect, useState } from "react";
import { ListChecks } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { InProgress, InProgressTask } from "@/lib/api/types";
import { estadoDeTarea, humanizar, textoDeFalta, textoSinFaltas, valorDeDato } from "@/lib/turno";

/**
 * «En curso» (HU-AOS-28): al tomar una conversación escalada, qué trámite iba, en qué etapa, qué datos
 * ya dio el cliente, qué falta y la última acción, para seguir sin leer todo el historial. Se vuelve a
 * leer cuando cambia el estado de la escalación (tomarla la anota en las tareas).
 */
export function EnCurso({ conversationId, estadoEscalacion }: { conversationId: string; estadoEscalacion: string }) {
  const [datos, setDatos] = useState<{ clave: string; valor: InProgress | null; error: boolean } | null>(null);
  const clave = `${conversationId}:${estadoEscalacion}`;

  useEffect(() => {
    let vigente = true;
    fetch(`/api/conversations/${conversationId}/in-progress`)
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as InProgress | null;
        if (vigente) setDatos({ clave, valor: res.ok ? json : null, error: !res.ok });
      })
      .catch(() => vigente && setDatos({ clave, valor: null, error: true }));
    return () => {
      vigente = false;
    };
  }, [conversationId, clave]);

  const actual = datos?.clave === clave ? datos : null;
  if (!actual) {
    return (
      <div className="flex flex-col gap-2" role="status" aria-busy="true" aria-label="Cargando lo que está en curso">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  // Sin permiso o sin datos: la tarjeta no estorba (el ticket ya dice por qué se escaló).
  if (actual.error || !actual.valor || actual.valor.tasks.length === 0) return null;

  return (
    // Plegable y cerrado: deja lugar al hilo hasta que la persona quiera el detalle.
    <details className="group rounded-lg border border-border-soft bg-surface px-4 py-3">
      <summary
        className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-headline [&::-webkit-details-marker]:hidden focus-visible:outline-2"
      >
        <ListChecks aria-hidden className="h-4 w-4 text-text-soft" />
        En curso
        <span className="font-normal text-text-soft">
          · {actual.valor.tasks.length === 1 ? "1 trámite" : `${actual.valor.tasks.length} trámites`}
        </span>
      </summary>
      <ul className="mt-3 flex flex-col gap-3">
        {actual.valor.tasks.map((t) => (
          <li key={t.task_id}>
            <Tarea t={t} />
          </li>
        ))}
      </ul>
    </details>
  );
}

function Tarea({ t }: { t: InProgressTask }) {
  return (
    <article className="flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-headline">{t.title ?? humanizar(t.procedure_id)}</span>
        <Badge variant={t.status === "escalated" ? "warning" : t.in_focus ? "info" : "neutral"}>{estadoDeTarea(t)}</Badge>
        <span className="text-xs text-text-soft">Etapa: {humanizar(t.stage)}</span>
      </div>

      {t.missing.length > 0 ? (
        <ul className="list-disc pl-5 text-body" aria-label="Lo que falta">
          {t.missing.map((m) => (
            <li key={`${m.kind}-${m.name}`}>{textoDeFalta(m)}</li>
          ))}
        </ul>
      ) : (
        <p className="text-text-soft">{textoSinFaltas(t)}</p>
      )}

      {t.data.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-link">Datos que ya dio el cliente ({t.data.length})</summary>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {t.data.map((d) => (
              <div key={d.name} className="contents">
                <dt className="text-text-soft">{d.label}</dt>
                <dd className="break-words text-body">
                  {valorDeDato(d.value)}
                  {d.confirmed ? " · confirmado" : ""}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      {t.last_action && (
        <p className="text-xs text-text-soft">
          Última acción: {humanizar(t.last_action.action)} —{" "}
          {t.last_action.ok ? "salió bien" : `falló${t.last_action.reason_code ? ` (${humanizar(t.last_action.reason_code)})` : ""}`}
        </p>
      )}
    </article>
  );
}
