"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { RetiredAsideConnection, RetiredReferenceRow, RetiredReferencesReport } from "@/lib/api/types";
import {
  AYUDA_APARTE,
  ETIQUETA_APARTE,
  agruparPorAgente,
  etiquetaDeAlcance,
  resumenDelReporte,
} from "@/lib/referencias-retiradas";

type Lectura = { reporte: RetiredReferencesReport } | { error: string } | { sinPermiso: true };

async function leer(url: string): Promise<Lectura> {
  const res = await fetch(url, { cache: "no-store" });
  // Solo master: para quien no lo es, el bloque no existe (nunca un 403 por diseño).
  if (res.status === 403) return { sinPermiso: true };
  const json = (await res.json().catch(() => ({}))) as RetiredReferencesReport & { error?: string };
  return res.ok ? { reporte: json } : { error: json.error ?? "No se pudo revisar las referencias retiradas." };
}

function Fila({ fila }: { fila: RetiredReferenceRow }) {
  return (
    <li className="flex flex-col gap-1 rounded-md border border-border-soft p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={fila.scope === "draft" ? "neutral" : "warning"}>{etiquetaDeAlcance(fila)}</Badge>
        <code className="break-all text-xs text-text-soft">{fila.path}</code>
      </div>
      <p className="text-sm text-body">{fila.message}</p>
      {fila.where.length > 0 && (
        <p className="break-words text-xs text-text-soft">En uso en: {fila.where.join(" · ")}</p>
      )}
    </li>
  );
}

function ListaPorAgente({ filas, titulo }: { filas: RetiredReferenceRow[]; titulo: string }) {
  return (
    <ul className="flex flex-col gap-3" aria-label={titulo}>
      {agruparPorAgente(filas).map((g) => (
        <li key={g.agente} className="flex flex-col gap-2">
          <p className="text-sm font-medium text-headline">Agente {g.agente}</p>
          <ul className="flex flex-col gap-2">
            {g.filas.map((f, i) => (
              <Fila key={`${f.scope}-${f.version}-${f.path}-${i}`} fila={f} />
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function Apartado({ aside }: { aside: RetiredAsideConnection[] }) {
  return (
    <details className="rounded-md border border-border-soft px-3 py-2">
      <summary className="cursor-pointer text-sm font-medium text-headline">
        Apartado, no cuenta como falla ({aside.length})
      </summary>
      <ul className="mt-3 flex flex-col gap-4">
        {aside.map((c) => (
          <li key={c.connection_id} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral">{ETIQUETA_APARTE[c.reason]}</Badge>
              <span className="break-all text-xs text-text-soft">
                {c.connection_id}
                {c.release !== null && ` · release #${c.release}`}
              </span>
            </div>
            <p className="text-xs text-text-soft">{AYUDA_APARTE[c.reason]}</p>
            {c.rows.length > 0 && (
              <ul className="flex flex-col gap-1 pl-4 text-sm text-body">
                {c.rows.map((f, i) => (
                  <li key={`${f.agent}-${f.path}-${i}`} className="list-disc">
                    <span className="font-medium text-headline">{f.agent}:</span> {f.message}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * Referencias retiradas del negocio (HU-AOS-59, solo lectura, master): qué agentes y releases nombran una
 * acción o un procedimiento que el código ya retiró. Solo avisa: corregirlo lo decide una persona del equipo
 * con `agent-core db migrar-referencias`, no hay botón aquí (decisión del dueño, 2026-11-03).
 */
export function ReferenciasRetiradas({ tenantId }: { tenantId: string }) {
  const url = `/api/platform/tenants/${tenantId}/retired-references`;
  const [lectura, setLectura] = useState<Lectura | null>(null);

  useEffect(() => {
    let vigente = true;
    void leer(url).then((l) => {
      if (vigente) setLectura(l);
    });
    return () => {
      vigente = false;
    };
  }, [url]);

  if (lectura && "sinPermiso" in lectura) return null;
  const titulo = `retiradas-${tenantId}`;
  return (
    <section className="flex flex-col gap-3 border-t border-border-soft pt-4" aria-labelledby={titulo}>
      <p id={titulo} className="text-sm font-medium text-headline">
        Referencias retiradas
      </p>
      {!lectura ? (
        <p className="text-sm text-body">Revisando agentes y releases…</p>
      ) : "error" in lectura ? (
        <p role="alert" className="text-sm text-status-danger-fg">
          {lectura.error}
        </p>
      ) : (
        <Contenido r={lectura.reporte} />
      )}
    </section>
  );
}

function Contenido({ r }: { r: RetiredReferencesReport }) {
  const hayAparte = r.aside.length > 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={r.affected ? "warning" : "success"}>{r.affected ? "Hay afectados" : "Sin afectados"}</Badge>
        <p className="text-sm text-body">{resumenDelReporte(r)}</p>
      </div>
      {r.error && (
        <p role="alert" className="text-sm text-status-danger-fg">
          No se pudo revisar todo el negocio: {r.error}
        </p>
      )}

      {r.rows.length > 0 && <ListaPorAgente filas={r.rows} titulo="Agentes y versiones afectados" />}

      {r.affected_connections.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-headline">Releases activas afectadas</p>
          <ul className="flex flex-col gap-1 text-sm text-body">
            {r.affected_connections.map((c) => (
              <li key={`${c.connection_id}-${c.release}`} className="break-all">
                Conexión <span className="text-text-soft">{c.connection_id}</span> · release #{c.release}
              </li>
            ))}
          </ul>
        </div>
      )}

      {r.drafts.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-headline">Borradores con referencias retiradas</p>
          <p className="text-xs text-text-soft">
            El dueño los ve avisados en su editor. No cuentan como falla ni se migran solos.
          </p>
          <ListaPorAgente filas={r.drafts} titulo="Borradores con referencias retiradas" />
        </div>
      )}

      {hayAparte && <Apartado aside={r.aside} />}

      {r.affected && (
        <p className="text-xs text-text-soft">
          Solo avisa. Corregirlo lo decide una persona del equipo: <code>agent-core db migrar-referencias</code> muestra el
          cambio antes de aplicarlo.
        </p>
      )}
    </div>
  );
}
