"use client";

import Link from "next/link";
import { AlertCircle, Check, Loader2, PlayCircle, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { QaCatalogo, QaEjecucion, QaProgreso } from "@/lib/api/types";
import { formatDate, formatDateTime } from "@/lib/format";
import { fechaDeCatalogo, porcentaje, segmentosDeProgreso } from "@/lib/qa/estados";

export type EstadoGuardado = { estado: "idle" | "guardando" | "ok" | "error"; en?: Date };

function Leyenda({ progreso }: { progreso: QaProgreso }) {
  const segmentos = segmentosDeProgreso(progreso);
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-body">
      {segmentos.map((s) => (
        <li key={s.clave} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={`h-2 w-2 rounded-full ${PUNTO[s.tono]}`} />
          {s.label} <span className="tabular-nums text-headline">{s.valor}</span>
        </li>
      ))}
      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden className="h-2 w-2 rounded-full bg-hover ring-1 ring-border-strong" />
        Sin correr <span className="tabular-nums text-headline">{progreso.sin_correr}</span>
      </li>
    </ul>
  );
}

const PUNTO = {
  success: "bg-status-success-fg",
  danger: "bg-status-danger-fg",
  warning: "bg-status-warning-fg",
  info: "bg-status-info-fg",
  neutral: "bg-text-soft",
} as const;

function barra(progreso: QaProgreso) {
  return segmentosDeProgreso(progreso).map((s) => ({ key: s.clave, value: s.valor, label: s.label, tone: s.tono }));
}

function Guardado({ guardado }: { guardado: EstadoGuardado }) {
  if (guardado.estado === "guardando") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-body" role="status">
        <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> Guardando…
      </span>
    );
  }
  if (guardado.estado === "ok") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-body" role="status">
        <Check aria-hidden className="h-3.5 w-3.5 text-status-success-fg" /> Guardado{" "}
        {guardado.en?.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
      </span>
    );
  }
  if (guardado.estado === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-status-danger-fg" role="alert">
        <AlertCircle aria-hidden className="h-3.5 w-3.5" /> No se guardó el último cambio
      </span>
    );
  }
  return null;
}

/**
 * Cabecera de Ejecutar (HU-QA-03): ciclo y catálogo, mi avance (barra por estado) y el del
 * ciclo, el estado del guardado y la acción principal (empezar o enviar el informe).
 */
export function CabeceraDeAvance({
  catalogo,
  run,
  guardado,
  empezando,
  onEmpezar,
  onEnviar,
}: {
  catalogo: QaCatalogo;
  run: QaEjecucion | null;
  guardado: EstadoGuardado;
  empezando: boolean;
  onEmpezar: () => void;
  onEnviar: () => void;
}) {
  const ciclo = catalogo.ciclo;
  const mio = run?.progreso;
  const delCiclo = catalogo.progreso;
  return (
    <Card>
      <CardContent className="flex flex-col gap-5 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-sh-block text-headline">{ciclo?.nombre}</h2>
            <p className="text-xs text-text-soft">
              Catálogo v{catalogo.catalogo?.version} · {fechaDeCatalogo(catalogo.catalogo?.fecha)} · ciclo abierto el{" "}
              {formatDate(ciclo?.abierto_en)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Guardado guardado={guardado} />
            {!run && (
              <Button variant="accent" onClick={onEmpezar} loading={empezando}>
                <PlayCircle aria-hidden className="h-4 w-4" />
                Empezar a probar
              </Button>
            )}
            {run?.editable && (
              <Button variant="accent" onClick={onEnviar}>
                <Send aria-hidden className="h-4 w-4" />
                Enviar informe
              </Button>
            )}
            {run && run.estado === "enviada" && (
              <>
                <Badge variant="success">Informe enviado {formatDateTime(run.enviada_en)}</Badge>
                <Link href={`/pruebas/informes/${run.id}`} className="text-sm text-link underline-offset-2 hover:underline">
                  Ver mi informe
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section aria-label="Mi avance" className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sh-label text-headline">Mi avance</span>
              {mio ? (
                <span className="text-sm tabular-nums text-body">
                  <span className="font-display text-sh-block text-headline">{mio.terminadas}</span> de {mio.total} ·{" "}
                  {porcentaje(mio.terminadas, mio.total)} %
                </span>
              ) : (
                <span className="text-xs text-text-soft">Todavía no empezaste</span>
              )}
            </div>
            <Progress
              label="Mi avance"
              value={mio?.terminadas ?? 0}
              max={mio?.total || delCiclo.total || 1}
              segments={mio ? barra(mio) : []}
              valueText={mio ? `${mio.terminadas} de ${mio.total} pruebas terminadas` : "Sin empezar"}
            />
            {mio && <Leyenda progreso={mio} />}
          </section>
          <section aria-label="Avance del ciclo" className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sh-label text-headline">Ciclo, todos los testers</span>
              <span className="text-sm tabular-nums text-body">{porcentaje(delCiclo.terminadas, delCiclo.total)} %</span>
            </div>
            <Progress
              size="sm"
              label="Avance del ciclo"
              value={delCiclo.terminadas}
              max={delCiclo.total || 1}
              segments={barra(delCiclo)}
              valueText={`${delCiclo.terminadas} de ${delCiclo.total} pruebas terminadas en el ciclo`}
            />
            <p className="text-xs text-text-soft">
              {delCiclo.falla > 0 ? `${delCiclo.falla} con falla · ` : ""}
              {delCiclo.bloqueada > 0 ? `${delCiclo.bloqueada} bloqueadas · ` : ""}
              {delCiclo.sin_correr} sin correr
            </p>
          </section>
        </div>
        {run && !run.editable && run.estado !== "enviada" && (
          <p role="status" className="text-sm text-body">
            Este ciclo ya se cerró: tu ejecución quedó en solo lectura.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
