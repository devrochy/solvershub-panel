"use client";

import { Download, Printer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { QaEjecucion } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { ESTADO_PASO, fechaDeCatalogo, porcentaje, segmentosDeProgreso, type EstadoPaso } from "@/lib/qa/estados";
import { leerInforme } from "@/lib/qa/informe";

import { URL_ADJUNTO } from "./api";
import { IconoEstado } from "./icono-estado";

/**
 * Informe de una ejecución (HU-QA-03, D-SPEC-30-5). Si ya se envió muestra la foto congelada;
 * si sigue en curso, el avance en vivo. «Imprimir o guardar PDF» usa la hoja de impresión del
 * navegador (la barra lateral y la superior no se imprimen).
 */
export function DetalleDeInforme({ run }: { run: QaEjecucion }) {
  const informe = leerInforme(run.informe);
  const p = informe?.progreso ?? run.progreso;
  const segmentos = segmentosDeProgreso(p).map((s) => ({ key: s.clave, value: s.valor, label: s.label, tone: s.tono }));
  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-sh-h1 text-headline">
            Informe de {run.tester.nombre || run.tester.email}
          </h2>
          <p className="text-sm text-body">
            {run.ciclo_nombre}
            {informe ? ` · catálogo v${informe.catalogo.version} (${fechaDeCatalogo(informe.catalogo.fecha)})` : ""}
          </p>
          <p className="text-xs text-text-soft">
            Empezó {formatDateTime(run.iniciada_en)}
            {run.enviada_en ? ` · enviado ${formatDateTime(run.enviada_en)}` : ""}
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
            <span className="font-display text-sh-hero tabular-nums text-headline">{p.terminadas}</span> de {p.total} pruebas
            terminadas ({porcentaje(p.terminadas, p.total)} %)
          </p>
          <Progress label="Avance" value={p.terminadas} max={p.total || 1} segments={segmentos} />
          <dl className="grid grid-cols-3 gap-2 text-center text-sm sm:grid-cols-6">
            {[
              ["OK", p.ok],
              ["Falla", p.falla],
              ["Bloqueada", p.bloqueada],
              ["Omitida", p.omitida],
              ["En curso", p.en_curso],
              ["Sin correr", p.sin_correr],
            ].map(([label, valor]) => (
              <div key={label} className="rounded-md bg-surface-2 px-2 py-2">
                <dt className="text-xs text-text-soft">{label}</dt>
                <dd className="font-display text-sh-block tabular-nums text-headline">{valor}</dd>
              </div>
            ))}
          </dl>
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

      {informe && informe.pruebas.length > 0 && (
        <section aria-label="Pruebas ejecutadas" className="flex flex-col gap-3">
          <h3 className="font-display text-sh-block text-headline">Pruebas ejecutadas ({informe.pruebas.length})</h3>
          {informe.pruebas.map((prueba) => (
            <Card key={prueba.slug} className="break-inside-avoid">
              <CardContent className="flex flex-col gap-3 pt-5">
                <div className="flex flex-wrap items-start gap-2">
                  <IconoEstado estado={prueba.estado} className="mt-1" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium text-headline">{prueba.titulo}</span>
                    <span className="text-xs text-text-soft">
                      {[prueba.modulo, prueba.grupo, ...prueba.hu].filter(Boolean).join(" · ")}
                    </span>
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
          ))}
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
