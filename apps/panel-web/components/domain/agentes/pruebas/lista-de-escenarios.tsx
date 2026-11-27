"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useConfirm } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EscenarioDePrueba, PruebasInforme } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";
import {
  ESTADO_DE_ESCENARIO,
  MAX_ESCENARIOS_POR_CORRIDA,
  ORIGEN_DE_ESCENARIO,
  resultadoDeEscenario,
  textoDeProbar,
} from "@/lib/pruebas-del-agente";
import { tiempoRelativo } from "@/lib/notificaciones/tipos";
import { useAction } from "@/lib/use-action";

import { EscenarioForm } from "./escenario-form";
import { llamar, rutaDePruebas } from "./llamar";

/**
 * Lista de escenarios del agente (HU-AOS-105): estado, origen y resultado de la última corrida. Los aprobados
 * se marcan para probar; los de la IA nacen en borrador y se revisan antes de aprobarlos.
 */
export function ListaDeEscenarios({
  agenteId,
  escenarios,
  tope,
  ultimoInforme,
  puedeEditar,
  proponiendo,
  onProponer,
  onProbar,
}: {
  agenteId: string;
  escenarios: EscenarioDePrueba[];
  tope: number;
  /** El informe de la última corrida, para el resultado de cada fila. */
  ultimoInforme: PruebasInforme | null;
  puedeEditar: boolean;
  proponiendo: boolean;
  onProponer: () => void;
  onProbar: (caseIds: string[]) => void;
}) {
  const confirm = useConfirm();
  const { run, pending } = useAction();
  const [elegidos, setElegidos] = useState<Set<string> | null>(null);
  const [formulario, setFormulario] = useState<{
    escenario: EscenarioDePrueba | null;
    clave: number;
  } | null>(null);

  const aprobados = useMemo(
    () => escenarios.filter((e) => e.estado === "aprobado"),
    [escenarios],
  );
  const borradores = escenarios.filter((e) => e.estado === "borrador");
  // Por defecto van todos los aprobados (hasta el máximo por corrida); quien marca a mano decide.
  const seleccion = useMemo(() => {
    const vigentes = new Set(aprobados.map((e) => e.id));
    if (elegidos === null)
      return new Set(
        aprobados.slice(0, MAX_ESCENARIOS_POR_CORRIDA).map((e) => e.id),
      );
    return new Set([...elegidos].filter((id) => vigentes.has(id)));
  }, [aprobados, elegidos]);
  const resultados = useMemo(
    () =>
      new Map(
        (ultimoInforme?.escenarios ?? []).map((e) => [
          e.case_id,
          resultadoDeEscenario(e),
        ]),
      ),
    [ultimoInforme],
  );
  const cuandoProbo =
    ultimoInforme?.terminada_en ?? ultimoInforme?.iniciada_en ?? null;

  function alternar(id: string, marcado: boolean) {
    const siguiente = new Set(seleccion);
    if (marcado) siguiente.add(id);
    else siguiente.delete(id);
    setElegidos(siguiente);
  }

  async function aprobar(ids: string[]) {
    await run(async () => {
      for (const id of ids) {
        const res = await llamar(rutaDePruebas(agenteId, `/${id}`), "PATCH", {
          estado: "aprobado",
        });
        if (!res.ok)
          return {
            ok: false,
            status: res.status,
            error: res.error,
            code: res.code,
          };
      }
      return {
        ok: true,
        success:
          ids.length === 1
            ? "Escenario aprobado."
            : `${formatNumber(ids.length)} escenarios aprobados.`,
      };
    });
  }

  async function borrar(e: EscenarioDePrueba) {
    const ok = await confirm({
      title: `¿Borrar «${e.titulo}»?`,
      description:
        "El escenario deja de salir en la lista y de correrse. Los informes anteriores se conservan.",
      confirmLabel: "Borrar escenario",
    });
    if (!ok) return;
    await run(async () => {
      const res = await llamar(rutaDePruebas(agenteId, `/${e.id}`), "DELETE");
      return res.ok
        ? { ok: true, success: "Escenario borrado." }
        : { ok: false, status: res.status, error: res.error, code: res.code };
    });
  }

  if (escenarios.length === 0) {
    return (
      <>
        <div className="rounded-lg border border-border-soft bg-surface">
          <EmptyState
            title="Pon a prueba a tu agente"
            description="Simulamos clientes reales en un entorno de prueba: nada se envía a nadie ni toca tus datos. Ves qué falla y cómo arreglarlo."
            action={
              puedeEditar ? (
                <div className="flex flex-wrap justify-center gap-3">
                  <Button onClick={onProponer} loading={proponiendo}>
                    Proponer pruebas
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setFormulario({ escenario: null, clave: Date.now() })
                    }
                  >
                    Escribir una
                  </Button>
                </div>
              ) : undefined
            }
          />
        </div>
        {formulario && (
          <EscenarioForm
            key={formulario.clave}
            agenteId={agenteId}
            escenario={null}
            open
            onOpenChange={(o) => !o && setFormulario(null)}
          />
        )}
      </>
    );
  }

  return (
    <section
      className="flex flex-col gap-3"
      aria-labelledby="pruebas-escenarios"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2
          id="pruebas-escenarios"
          className="flex-1 font-display text-sh-block text-headline"
        >
          Escenarios{" "}
          <span className="text-sm font-normal text-text-soft">
            · {formatNumber(escenarios.length)} de {formatNumber(tope)}
          </span>
        </h2>
        {puedeEditar && (
          <>
            <Button
              variant="outline"
              onClick={() =>
                setFormulario({ escenario: null, clave: Date.now() })
              }
            >
              Escribir uno
            </Button>
            <Button
              variant="outline"
              onClick={onProponer}
              loading={proponiendo}
            >
              Pedir a la IA
            </Button>
            <Button
              onClick={() => onProbar([...seleccion])}
              disabled={seleccion.size === 0}
            >
              {seleccion.size === 0 ? "Probar" : textoDeProbar(seleccion.size)}
            </Button>
          </>
        )}
      </div>

      {borradores.length > 0 && puedeEditar && (
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-status-warning-bg px-3 py-2 text-sm text-status-warning-fg">
          <span className="flex-1">
            {borradores.length === 1
              ? "Hay 1 escenario en borrador."
              : `Hay ${formatNumber(borradores.length)} escenarios en borrador.`}{" "}
            Revísalos y apruébalos antes de probar.
          </span>
          <Button
            size="sm"
            variant="outline"
            loading={pending}
            onClick={() => void aprobar(borradores.map((b) => b.id))}
          >
            {borradores.length === 1
              ? "Aprobar el borrador"
              : "Aprobar todos los borradores"}
          </Button>
        </div>
      )}
      {aprobados.length > MAX_ESCENARIOS_POR_CORRIDA && (
        <p className="text-sm text-text-soft">
          Cada corrida prueba hasta {MAX_ESCENARIOS_POR_CORRIDA} escenarios:
          marca los que quieras.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-border-soft bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <span className="sr-only">Incluir en la prueba</span>
              </TableHead>
              <TableHead>Escenario</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Última prueba</TableHead>
              {puedeEditar && (
                <TableHead className="text-right">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {escenarios.map((e) => {
              const estado = ESTADO_DE_ESCENARIO[e.estado];
              const resultado = resultados.get(e.id);
              return (
                <TableRow key={e.id}>
                  <TableCell>
                    {e.estado === "aprobado" && puedeEditar ? (
                      <Checkbox
                        id={`prueba-${e.id}`}
                        label={`Incluir «${e.titulo}» en la prueba`}
                        checked={seleccion.has(e.id)}
                        onCheckedChange={(v) => alternar(e.id, v)}
                        className="[&_label]:sr-only"
                      />
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <span className="flex min-w-48 flex-col">
                      <span className="font-medium text-headline">
                        {e.titulo}
                      </span>
                      <span className="line-clamp-2 text-xs text-text-soft">
                        {e.objetivo_cliente}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-body">
                    {ORIGEN_DE_ESCENARIO[e.origen]}
                  </TableCell>
                  <TableCell>
                    <Badge variant={estado.tono}>{estado.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {resultado && resultado.estado !== "sin_probar" ? (
                      <span className="flex flex-col items-start gap-0.5">
                        <Badge variant={resultado.tono}>
                          {resultado.label}
                        </Badge>
                        {cuandoProbo && (
                          <span className="text-xs text-text-soft">
                            {tiempoRelativo(cuandoProbo)}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-sm text-text-soft">Sin probar</span>
                    )}
                  </TableCell>
                  {puedeEditar && (
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1">
                        {e.estado === "borrador" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void aprobar([e.id])}
                            disabled={pending}
                          >
                            Aprobar
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Editar «${e.titulo}»`}
                          onClick={() =>
                            setFormulario({ escenario: e, clave: Date.now() })
                          }
                        >
                          <Pencil aria-hidden className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Borrar «${e.titulo}»`}
                          onClick={() => void borrar(e)}
                          disabled={pending}
                        >
                          <Trash2 aria-hidden className="h-4 w-4" />
                        </Button>
                      </span>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-text-soft">
        Los escenarios de la IA nacen como borrador: revísalos y apruébalos
        antes de probar.
      </p>
      {formulario && (
        <EscenarioForm
          key={formulario.clave}
          agenteId={agenteId}
          escenario={formulario.escenario}
          open
          onOpenChange={(o) => !o && setFormulario(null)}
        />
      )}
    </section>
  );
}
