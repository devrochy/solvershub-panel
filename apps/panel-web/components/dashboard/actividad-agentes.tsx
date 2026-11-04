"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import {
  CLAVE_OTROS,
  LineChart,
  clasesDeSerie,
  type ChartDatum,
  type ChartSeries,
} from "@/components/dataviz";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { AgenteResumen, PuntoActividad, ResumenPorAgente } from "@/lib/api/types";
import { formatUsd } from "@/lib/format";
import { rangoDePeriodo } from "@/lib/resumen/periodos";
import { cn } from "@/lib/utils";

type Metrica = "turnos" | "conversaciones" | "costo";

const METRICAS: { id: Metrica; label: string }[] = [
  { id: "turnos", label: "Turnos" },
  { id: "conversaciones", label: "Conversaciones" },
  { id: "costo", label: "Costo IA" },
];

function valorDe(punto: PuntoActividad | undefined, metrica: Metrica): number | null {
  if (!punto) return null;
  return punto[metrica] ?? null;
}

function serieDe(agente: AgenteResumen): PuntoActividad[] {
  return agente.serie ?? [];
}

function totalDe(agente: AgenteResumen, metrica: Metrica): number {
  return serieDe(agente).reduce((suma, punto) => suma + (valorDe(punto, metrica) ?? 0), 0);
}

/**
 * Evolución diaria de los agentes (ADR-0171, adenda). El período vive en la URL y su selector en
 * el encabezado de la página; la métrica es una decisión de lectura local. La gráfica dibuja a los
 * agentes con actividad: el resto aparece en su tarjeta, con «Sin actividad en el período».
 */
export function ActividadDeAgentes({ datos }: { datos: ResumenPorAgente }) {
  const agentes = useMemo(() => datos.agentes ?? [], [datos.agentes]);
  const verCosto = agentes.some((a) => serieDe(a).some((p) => typeof p.costo === "number"));
  const [metricaElegida, setMetricaElegida] = useState<Metrica>("turnos");
  const metrica: Metrica = metricaElegida === "costo" && !verCosto ? "turnos" : metricaElegida;
  const [ocultas, setOcultas] = useState<ReadonlySet<string>>(new Set());

  const conActividad = useMemo(
    () =>
      agentes
        .filter((a) => totalDe(a, "turnos") > 0)
        .sort((a, b) => totalDe(b, "turnos") - totalDe(a, "turnos") || a.name.localeCompare(b.name)),
    [agentes],
  );

  const declaradas = useMemo<ChartSeries[]>(() => {
    const top = conActividad.slice(0, 4).map((a) => ({ key: a.ref, label: a.name }));
    if (conActividad.length > 4) top.push({ key: CLAVE_OTROS, label: "Otros" });
    return top;
  }, [conActividad]);

  const datosGrafico = useMemo<ChartDatum[]>(() => {
    const base = conActividad[0] ? serieDe(conActividad[0]) : [];
    const otros = conActividad.slice(4);
    return base.map((punto, i) => {
      const values: Record<string, number | null> = {};
      for (const serie of declaradas) {
        if (serie.key === CLAVE_OTROS) {
          const sumandos = otros
            .map((a) => valorDe(serieDe(a)[i], metrica))
            .filter((v): v is number => v !== null);
          values[serie.key] = sumandos.length ? sumandos.reduce((a, b) => a + b, 0) : null;
          continue;
        }
        const agente = conActividad.find((a) => a.ref === serie.key);
        values[serie.key] = agente ? valorDe(serieDe(agente)[i], metrica) : null;
      }
      return { x: punto.fecha, values };
    });
  }, [conActividad, declaradas, metrica]);

  const visibles = declaradas.map((s) => s.key).filter((k) => !ocultas.has(k));

  function alternarSerie(key: string) {
    setOcultas((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(key)) siguiente.delete(key);
      else if (declaradas.length - siguiente.size > 1) siguiente.add(key);
      return siguiente;
    });
  }

  const yFormat =
    metrica === "costo"
      ? (v: number) => formatUsd(v, 2)
      : ("number" as const);
  const etiquetaMetrica = METRICAS.find((m) => m.id === metrica)?.label ?? "Turnos";

  return (
    <section aria-labelledby="actividad-agentes" className="flex flex-col gap-3">
      <Card>
        <CardHeader className="gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle id="actividad-agentes">Evolución diaria</CardTitle>
            <div role="group" aria-label="Métrica de la actividad" className="flex items-center gap-1">
              {METRICAS.filter((m) => m.id !== "costo" || verCosto).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={metrica === m.id}
                  onClick={() => setMetricaElegida(m.id)}
                  className={cn(
                    "h-9 rounded-md px-3 text-sm transition-colors",
                    metrica === m.id
                      ? "bg-hover text-headline"
                      : "text-body hover:bg-hover hover:text-headline",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <CardDescription>
            <span className="font-mono text-xs tabular-nums">{rangoDePeriodo(datos.periodo)}</span> ·{" "}
            {metrica === "costo"
              ? "Costo de IA por día. El General incluye el Coordinador y lo no asignado."
              : `${etiquetaMetrica} por día. El General incluye lo no asignado; los turnos del Coordinador van en el bloque del negocio.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {conActividad.length === 0 ? (
            <EmptyState
              title="Sin actividad en este período"
              description="Cuando tus agentes atiendan conversaciones, aquí verás su actividad por día."
              action={
                <Link href="/agentes" className="text-sm text-link hover:underline">
                  Ver agentes
                </Link>
              }
            />
          ) : (
            <>
              {declaradas.length > 1 && (
                <div role="group" aria-label="Series del gráfico" className="flex flex-wrap items-center gap-1.5">
                  {declaradas.map((s) => {
                    const activa = !ocultas.has(s.key);
                    const clases = clasesDeSerie(s.key, declaradas);
                    return (
                      <button
                        key={s.key}
                        type="button"
                        aria-pressed={activa}
                        onClick={() => alternarSerie(s.key)}
                        className={cn(
                          "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors",
                          activa
                            ? "border-border-soft text-body"
                            : "border-transparent text-text-soft line-through",
                        )}
                      >
                        <span aria-hidden className={cn("h-2 w-2 rounded-full", clases.fondo)} />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {conActividad.length > 4 && (
                <p className="text-xs text-text-soft">
                  Se dibujan los 4 agentes con más turnos; el resto se suma en «Otros» y sigue en su
                  tarjeta.
                </p>
              )}
              <LineChart
                title={`${etiquetaMetrica} por agente y día`}
                series={declaradas}
                data={datosGrafico}
                visibleKeys={visibles}
                xFormat={(x) =>
                  new Date(`${x}T12:00:00Z`).toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "short",
                    timeZone: "UTC",
                  })
                }
                xHeader="Día"
                yFormat={yFormat}
                height={220}
                emptyMessage="Sin actividad en este período."
              />
            </>
          )}
        </CardContent>
      </Card>

    </section>
  );
}
