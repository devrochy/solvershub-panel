"use client";

import { useState } from "react";
import { ChevronDown, Download, Printer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { QaEjecucion } from "@/lib/api/types";
import { ESTADO_PASO, fechaDeCatalogo, fechaEnPalabras, resumenDeAvance, segmentosDeProgreso, type EstadoPaso } from "@/lib/qa/estados";
import { leerInforme, type PruebaDeInforme, type SeccionDeInforme } from "@/lib/qa/informe";
import { cn } from "@/lib/utils";


import { URL_ADJUNTO } from "./api";
import { IconoEstado } from "./icono-estado";

/** Nombres de entorno del informe agrupado; coinciden con la lista lateral. */
const ENTORNO_DE_INFORME: Record<string, string> = {
  panel: "Panel",
  apk: "APK",
  whatsapp: "WhatsApp",
  web: "Web",
  api: "API",
  otros: "Sin clasificar",
};

/** Lo que no salió bien en un entorno, por sección: «1 falla en Agenda › Agendas». */
function lineaDeSeccion(seccion: SeccionDeInforme): string {
  const partes: string[] = [];
  for (const area of seccion.areas) {
    for (const sub of area.subsecciones.length > 0 ? area.subsecciones : [{ ...area, subseccion: "" }]) {
      const donde = sub.subseccion ? `${area.area} › ${sub.subseccion}` : area.area;
      if (sub.falla > 0) partes.push(`${sub.falla} ${sub.falla === 1 ? "falla" : "fallas"} en ${donde}`);
      if (sub.bloqueada > 0) partes.push(`${sub.bloqueada} ${sub.bloqueada === 1 ? "bloqueada" : "bloqueadas"} en ${donde}`);
      if (sub.sin_correr > 0) partes.push(`${sub.sin_correr} sin correr en ${donde}`);
    }
  }
  return partes.length > 0 ? partes.join(" · ") : "Todo bien";
}

function PruebaDelInforme({ prueba }: { prueba: PruebaDeInforme }) {
  const donde = [...new Set([prueba.modulo, prueba.grupo].filter(Boolean))];
  return (
    <Card className="break-inside-avoid">
      <CardContent className="flex flex-col gap-3 pt-5">
        <div className="flex flex-wrap items-start gap-2">
          <IconoEstado estado={prueba.estado} className="mt-1" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium text-headline">{prueba.titulo}</span>
            <span className="text-xs text-text-soft">{[...donde, ...prueba.hu].join(" · ")}</span>
          </div>
        </div>
        {prueba.nota && <p className="text-sm text-body">{prueba.nota}</p>}
        <ol className="flex flex-col gap-2 text-sm">
          {prueba.pasos.map((paso) => (
            <li key={paso.n} className="flex flex-col gap-1 rounded-md bg-surface-2 px-3 py-2">
              <span className="text-headline">
                {paso.n}. {paso.accion}{" "}
                <span className="text-xs text-body">
                  — {paso.estado ? (ESTADO_PASO[paso.estado as EstadoPaso]?.label ?? paso.estado) : "sin marcar"}
                </span>
              </span>
              {paso.esperado && <span className="text-xs text-text-soft">Esperado: {paso.esperado}</span>}
              {paso.nota && <span className="text-body">Nota: {paso.nota}</span>}
              {paso.adjuntos.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {paso.adjuntos.map((a) =>
                    a.mimetype.startsWith("image/") ? (
                      <a key={a.id} href={URL_ADJUNTO(a.id)} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element -- captura privada servida por el BFF */}
                        <img src={URL_ADJUNTO(a.id)} alt={`Captura ${a.nombre}`} className="h-32 max-w-full rounded-sm border border-border-soft object-contain" />
                      </a>
                    ) : (
                      <a key={a.id} href={URL_ADJUNTO(a.id)} target="_blank" rel="noreferrer" className="text-xs text-link">
                        {a.nombre}
                      </a>
                    ),
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

/**
 * Informe de una ejecución (HU-QA-03, D-SPEC-30-5). Si ya se envió muestra la foto congelada;
 * si sigue en curso, el avance en vivo. «Imprimir o guardar PDF» usa la hoja de impresión del
 * navegador (la barra lateral y la superior no se imprimen).
 */
export function DetalleDeInforme({ run }: { run: QaEjecucion }) {
  const informe = leerInforme(run.informe);
  const p = informe?.progreso ?? run.progreso;
  const segmentos = segmentosDeProgreso(p).map((s) => ({ key: s.clave, value: s.valor, label: s.label, tone: s.tono }));
  const [verResto, setVerResto] = useState(false);
  // PRU-07: primero lo que no salió bien; lo aprobado, plegado.
  const problemas = (informe?.pruebas ?? []).filter((x) => x.estado !== "ok" && x.estado !== "omitida");
  const resto = (informe?.pruebas ?? []).filter((x) => x.estado === "ok" || x.estado === "omitida");
  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-sh-h1 text-headline">
            Informe de {run.tester.nombre || run.tester.email}
          </h2>
          <p className="text-sm text-body">
            {run.ciclo_nombre}
            {informe ? ` · catálogo del ${fechaDeCatalogo(informe.catalogo.fecha)}` : ""}
          </p>
          <p className="text-xs text-text-soft">
            Empezó el {fechaEnPalabras(run.iniciada_en)}
            {run.enviada_en ? ` · lo envió el ${fechaEnPalabras(run.enviada_en)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {run.estado === "enviada" ? <Badge variant="success">Enviado</Badge> : <Badge variant="info">En curso</Badge>}
          {informe && (
            <>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer aria-hidden className="h-4 w-4" /> Imprimir o guardar PDF
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={`/api/qa/runs/${run.id}/report.md`} download>
                  <Download aria-hidden className="h-4 w-4" /> Descargar Markdown
                </a>
              </Button>
            </>
          )}
        </div>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-5">
          <p className="text-sm text-body">
            <span className="font-medium text-headline">
              {p.terminadas} de {p.total} pruebas terminadas
            </span>
            {" · "}
            {resumenDeAvance(p)}
          </p>
          <Progress label="Avance" value={p.terminadas} max={p.total || 1} segments={segmentos} />
          {informe?.comentario && (
            <blockquote className="border-l-2 border-focus pl-3 text-sm text-body">{informe.comentario}</blockquote>
          )}
        </CardContent>
      </Card>

      {!informe && (
        <p role="status" className="text-sm text-body">
          Esta ejecución todavía no se envió. El detalle paso a paso queda congelado cuando el tester envía su informe.
        </p>
      )}

      {informe && problemas.length > 0 && (
        <section aria-label="Fallas y bloqueos" className="flex flex-col gap-3">
          <h3 className="font-display text-sh-block text-headline">Fallas y bloqueos ({problemas.length})</h3>
          {problemas.map((prueba) => (
            <PruebaDelInforme key={prueba.slug} prueba={prueba} />
          ))}
        </section>
      )}

      {informe?.secciones && informe.secciones.length > 0 && (
        <section aria-label="Por entorno" className="flex flex-col gap-2">
          <h3 className="font-display text-sh-block text-headline">Por entorno</h3>
          <ul className="overflow-hidden rounded-lg border border-border-soft bg-surface">
            {informe.secciones.map((seccion) => (
              <li key={seccion.entorno} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-border-soft px-4 py-3 text-sm first:border-t-0">
                <span className="w-28 font-medium text-headline">{ENTORNO_DE_INFORME[seccion.entorno] ?? seccion.entorno}</span>
                <span className="w-44 tabular-nums text-body">
                  {seccion.ok} de {seccion.total} aprobadas
                </span>
                <span className="min-w-0 flex-1 text-text-soft">{lineaDeSeccion(seccion)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {informe && resto.length > 0 && (
        <section aria-label="Aprobadas y omitidas" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-sh-block text-headline">Aprobadas y omitidas ({resto.length})</h3>
            <Button variant="ghost" size="sm" className="print:hidden" aria-expanded={verResto} onClick={() => setVerResto((v) => !v)}>
              <ChevronDown aria-hidden className={cn("h-4 w-4 transition-transform duration-150", !verResto && "-rotate-90")} />
              {verResto ? "Ocultar los pasos" : "Ver los pasos"}
            </Button>
          </div>
          {/* Plegadas en pantalla; en el PDF van completas. */}
          <div className={cn("flex flex-col gap-3", !verResto && "hidden print:flex")}>
            {resto.map((prueba) => (
              <PruebaDelInforme key={prueba.slug} prueba={prueba} />
            ))}
          </div>
          {!verResto && (
            <ul className="flex flex-col gap-1 text-sm text-body print:hidden">
              {resto.map((prueba) => (
                <li key={prueba.slug} className="flex items-center gap-2">
                  <IconoEstado estado={prueba.estado} />
                  {prueba.titulo}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {informe && informe.sin_correr.length > 0 && (
        <section aria-label="Sin correr" className="flex flex-col gap-2">
          <h3 className="font-display text-sh-block text-headline">Sin correr ({informe.sin_correr.length})</h3>
          <ul className="columns-1 gap-6 text-sm text-body sm:columns-2">
            {informe.sin_correr.map((s) => (
              <li key={s.slug} className="break-inside-avoid py-0.5">
                {s.titulo}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
