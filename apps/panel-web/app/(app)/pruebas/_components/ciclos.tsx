"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { QaCiclo } from "@/lib/api/types";
import { fechaEnPalabras, porcentaje, rangoEnPalabras, resumenDeAvance, segmentosDeProgreso } from "@/lib/qa/estados";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

import { llamarQa } from "./api";
import { IconoEstado } from "./icono-estado";

function Ciclo({ ciclo, titulos, onCerrar }: { ciclo: QaCiclo; titulos: Record<string, string>; onCerrar?: () => void }) {
  const [abierto, setAbierto] = useState(ciclo.abierto);
  const p = ciclo.progreso;
  const problemas = Object.entries(ciclo.por_prueba ?? {}).filter(([, e]) => e === "falla" || e === "bloqueada");
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-display text-sh-block text-headline">{ciclo.nombre}</h2>
            <p className="text-xs text-text-soft">
              Catálogo del {fechaEnPalabras(ciclo.catalogo.fecha)} · {rangoEnPalabras(ciclo.abierto_en, ciclo.cerrado_en)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ciclo.abierto ? <Badge variant="info">Abierto</Badge> : <Badge>Cerrado</Badge>}
            {/* PRU-05: la acción va junto al ciclo que cierra. */}
            {onCerrar && (
              <Button size="sm" variant="outline" onClick={onCerrar}>
                <RotateCcw aria-hidden className="h-4 w-4" />
                Cerrar este ciclo
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Progress
            label={`Avance de ${ciclo.nombre}`}
            value={p.terminadas}
            max={p.total || 1}
            segments={segmentosDeProgreso(p).map((s) => ({ key: s.clave, value: s.valor, label: s.label, tone: s.tono }))}
          />
          <span className="shrink-0 text-sm tabular-nums text-body">{porcentaje(p.terminadas, p.total)} %</span>
        </div>
        <p className="text-sm text-body">{resumenDeAvance(p)}</p>
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
          <ChevronDown aria-hidden className={cn("h-4 w-4 transition-transform duration-150", !abierto && "-rotate-90")} />
          {abierto ? "Ocultar detalle" : "Ver detalle"}
        </Button>
        {abierto && (
          <div className="grid gap-5 md:grid-cols-2">
            <section aria-label="Ejecuciones" className="flex flex-col gap-2">
              <h3 className="text-sh-label text-headline">Ejecuciones ({ciclo.ejecuciones?.length ?? 0})</h3>
              {(ciclo.ejecuciones ?? []).length === 0 ? (
                <p className="text-sm text-body">Nadie ejecutó pruebas en este ciclo.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {(ciclo.ejecuciones ?? []).map((e) => (
                    <li key={e.run_id} className="flex items-center gap-3 text-sm">
                      <span className="min-w-0 flex-1 truncate text-headline">{e.tester}</span>
                      <span className="w-24 shrink-0">
                        <Progress size="sm" label={`Avance de ${e.tester}`} value={e.progreso.terminadas} max={e.progreso.total || 1} />
                      </span>
                      <span className="w-36 shrink-0 text-right text-xs text-body">
                        {e.estado === "enviada" ? `Enviado el ${fechaEnPalabras(e.enviada_en)}` : "En curso"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section aria-label="Fallas y bloqueos" className="flex flex-col gap-2">
              <h3 className="text-sh-label text-headline">Fallas y bloqueos ({problemas.length})</h3>
              {problemas.length === 0 ? (
                <p className="text-sm text-body">Sin fallas ni bloqueos.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {problemas.map(([slug, estado]) => (
                    <li key={slug} className="flex items-start gap-2 text-sm text-body">
                      <IconoEstado estado={estado} className="mt-0.5" />
                      {titulos[slug] ?? slug}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Ciclos de pruebas (HU-QA-03). Cerrar el abierto guarda su foto (lo que llevaba cada tester)
 * y abre uno nuevo con la última versión del catálogo; las pruebas vuelven a «sin correr».
 */
export function ListaDeCiclos({
  ciclos,
  titulos,
  puedeCerrar,
}: {
  ciclos: QaCiclo[];
  titulos: Record<string, string>;
  puedeCerrar: boolean;
}) {
  const router = useRouter();
  const [dialogo, setDialogo] = useState(false);
  const [nombre, setNombre] = useState("");
  const [cerrando, setCerrando] = useState(false);
  const abierto = ciclos.find((c) => c.abierto);
  const enCurso = (abierto?.ejecuciones ?? []).filter((e) => e.estado !== "enviada").length;

  async function cerrar() {
    if (!nombre.trim()) return;
    setCerrando(true);
    const r = await llamarQa<{ nombre: string }>("cycles/close", { method: "POST", json: { nombre: nombre.trim() } });
    setCerrando(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success(`Ciclo cerrado. Ya está abierto «${r.data.nombre}».`);
    setDialogo(false);
    setNombre("");
    router.refresh();
  }

  if (ciclos.length === 0) {
    return <EmptyState title="Todavía no hay ciclos" description="El primer ciclo se abre al importar el catálogo de pruebas." />;
  }

  return (
    <div className="flex flex-col gap-4">
      {ciclos.map((c) => (
        <Ciclo key={c.id} ciclo={c} titulos={titulos} onCerrar={c.abierto && puedeCerrar ? () => setDialogo(true) : undefined} />
      ))}
      <Dialog open={dialogo} onOpenChange={setDialogo}>
        <DialogContent
          title="Cerrar este ciclo"
          description={`«${abierto?.nombre ?? ""}» queda como foto fija con lo que llevaba cada tester. ${
            enCurso === 0
              ? "No hay ejecuciones en curso."
              : enCurso === 1
                ? "La ejecución en curso queda en solo lectura."
                : `Las ${enCurso} ejecuciones en curso quedan en solo lectura.`
          } El ciclo nuevo usa la última versión del catálogo y arranca con todas las pruebas sin correr.`}
        >
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void cerrar();
            }}
          >
            <Field label="Nombre del ciclo nuevo" htmlFor="nombre-ciclo" help="Por ejemplo: Release 2026-11." required>
              <Input id="nombre-ciclo" value={nombre} maxLength={120} onChange={(e) => setNombre(e.target.value)} required />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogo(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="danger" loading={cerrando} disabled={!nombre.trim()}>
                Cerrar ciclo y abrir «{nombre.trim() || "…"}»
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
