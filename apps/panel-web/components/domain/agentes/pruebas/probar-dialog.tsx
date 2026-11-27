"use client";

import { useCallback, useEffect, useState } from "react";
import * as RadioPrimitive from "@radix-ui/react-radio-group";

import { AvisoLimiteDePlan } from "@/components/domain/aviso-limite-de-plan";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Skeleton } from "@/components/ui/skeleton";
import type { PruebasCorrida, PruebasEstimado } from "@/lib/api/types";
import { creditos } from "@/lib/consumo";
import { formatNumber, formatUsd } from "@/lib/format";
import {
  creditosQueFaltan,
  estimadoDeK,
  opcionesDeK,
  repeticionesEnPalabras,
  vecesEnPalabras,
} from "@/lib/pruebas-del-agente";
import { cn } from "@/lib/utils";
import { useAction } from "@/lib/use-action";

import { llamar, rutaDePruebas } from "./llamar";

/** Qué se va a correr: los escenarios elegidos o, tras un informe, solo las que fallaron. */
export type QueProbar =
  | { tipo: "escenarios"; caseIds: string[] }
  | { tipo: "fallidas"; runId: string; cuantas: number };

/**
 * Diálogo «Probar» (HU-AOS-102/105): el dueño elige cuántas veces se repite cada escenario (de 1 al tope de su
 * negocio), ve lo que cuesta cada opción, cuánto sale de su cuota gratis y su saldo después, y la corrida solo
 * arranca al confirmar. Cambiar k no llama al servidor: el estimado trae el costo de todos los k.
 */
export function ProbarDialog({
  agenteId,
  que,
  open,
  onOpenChange,
  verCosto,
  puedeComprar,
  onLanzada,
}: {
  agenteId: string;
  que: QueProbar;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Solo el master: el costo real en dólares de cada k. */
  verCosto: boolean;
  puedeComprar: boolean;
  onLanzada: (corrida: PruebasCorrida) => void;
}) {
  const { run, pending } = useAction();
  const [estimado, setEstimado] = useState<PruebasEstimado | null>(null);
  const [k, setK] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [aviso, setAviso] = useState<string | undefined>();

  const esFallidas = que.tipo === "fallidas";
  const llave =
    que.tipo === "escenarios" ? que.caseIds.join(",") : `fallidas:${que.runId}`;

  const pedir = useCallback(
    () =>
      que.tipo === "escenarios"
        ? llamar<PruebasEstimado>(
            rutaDePruebas(agenteId, "/estimado"),
            "POST",
            { case_ids: que.caseIds },
          )
        : llamar<PruebasEstimado>(
            rutaDePruebas(
              agenteId,
              `/corridas/${que.runId}/volver-a-probar/estimado`,
            ),
            "POST",
          ),
    // `llave` resume a `que`: el estimado se pide otra vez solo cuando cambia lo que se va a probar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agenteId, llave],
  );

  const aplicarEstimado = useCallback(
    (res: Awaited<ReturnType<typeof pedir>>, conservarK?: number) => {
      setCargando(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setError(undefined);
      setEstimado(res.data);
      const opciones = opcionesDeK(res.data);
      const quiere = conservarK ?? res.data.k_por_defecto;
      setK(opciones.includes(quiere) ? quiere : (opciones[0] ?? 1));
    },
    [],
  );

  /** Pedirlo de nuevo (reintentar, o el costo cambió): el estimado de antes se queda a la vista mientras llega. */
  const recargar = useCallback(
    (conservarK?: number) => {
      setCargando(true);
      void pedir().then((res) => aplicarEstimado(res, conservarK));
    },
    [pedir, aplicarEstimado],
  );

  useEffect(() => {
    if (!open) return;
    let vigente = true;
    void pedir().then((res) => vigente && aplicarEstimado(res));
    return () => {
      vigente = false;
    };
  }, [open, pedir, aplicarEstimado]);

  const fila = estimadoDeK(estimado, k);
  const faltan = creditosQueFaltan(estimado, k);
  const sinSaldo = Boolean(fila && !fila.alcanza);
  const opciones = opcionesDeK(estimado);

  async function confirmar() {
    if (!fila) return;
    setError(undefined);
    setAviso(undefined);
    let lanzada: PruebasCorrida | null = null;
    const ok = await run(async () => {
      const cuerpo = { k: fila.k, confirmo_creditos: fila.estimado };
      const res =
        que.tipo === "escenarios"
          ? await llamar<PruebasCorrida>(
              rutaDePruebas(agenteId, "/corridas"),
              "POST",
              { case_ids: que.caseIds, ...cuerpo },
            )
          : await llamar<PruebasCorrida>(
              rutaDePruebas(agenteId, `/corridas/${que.runId}/volver-a-probar`),
              "POST",
              cuerpo,
            );
      if (res.ok) {
        lanzada = res.data;
        return { ok: true, success: "La corrida quedó en cola." };
      }
      if (res.code === "estimado_cambio") {
        // El costo cambió mientras mirabas: se muestra el nuevo y se pide confirmar otra vez.
        setAviso(
          "El costo cambió mientras mirabas. Revisa el estimado nuevo y vuelve a confirmar.",
        );
        recargar(fila.k);
        return {
          ok: false,
          status: res.status,
          error: "El costo cambió: revisa el estimado nuevo.",
          code: res.code,
        };
      }
      if (res.code === "plan_limit_creditos") {
        setError("Tus créditos no alcanzan para esta corrida.");
        recargar(fila.k);
        return {
          ok: false,
          status: res.status,
          error: "Tus créditos no alcanzan para esta corrida.",
          code: res.code,
        };
      }
      setError(res.error);
      return {
        ok: false,
        status: res.status,
        error: res.error,
        code: res.code,
      };
    });
    if (ok && lanzada) {
      onOpenChange(false);
      onLanzada(lanzada);
    }
  }

  const titulo = esFallidas
    ? `Volver a probar ${que.cuantas === 1 ? "la que falló" : `las ${formatNumber(que.cuantas)} que fallaron`}`
    : `Probar ${que.tipo === "escenarios" && que.caseIds.length === 1 ? "1 escenario" : `${formatNumber(que.tipo === "escenarios" ? que.caseIds.length : 0)} escenarios`}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={titulo}
        description={
          esFallidas
            ? "Se repiten solo las que fallaron, contra el borrador de ahora, con tus arreglos aplicados."
            : "Cada escenario se repite varias veces para saber si el agente responde bien siempre, no solo una vez."
        }
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
      >
        {cargando && !estimado ? (
          <div
            className="flex flex-col gap-3"
            aria-busy="true"
            aria-label="Calculando el costo"
          >
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : !estimado || !fila ? (
          <div className="flex flex-col gap-4">
            <FormFeedback error={error ?? "No pudimos calcular el costo."} />
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => recargar()}>
                Intentar de nuevo
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <p
                id="pruebas-k-etiqueta"
                className="text-sh-label text-headline"
              >
                Repeticiones por escenario
              </p>
              <RadioPrimitive.Root
                aria-labelledby="pruebas-k-etiqueta"
                value={String(k)}
                onValueChange={(v) => setK(Number(v))}
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              >
                {opciones.map((valor) => {
                  const opcion = estimadoDeK(estimado, valor);
                  const elegida = valor === k;
                  return (
                    <RadioPrimitive.Item
                      key={valor}
                      value={String(valor)}
                      aria-label={`${vecesEnPalabras(valor)}: ${creditos(opcion?.estimado ?? 0)}`}
                      className={cn(
                        "flex flex-col gap-0.5 rounded-lg border px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                        elegida
                          ? "border-focus bg-focus/10"
                          : "border-control-border bg-surface hover:border-border-strong",
                      )}
                    >
                      <span className="text-sm text-body">
                        {vecesEnPalabras(valor)}
                      </span>
                      <span className="font-display text-xl font-semibold tabular-nums text-headline">
                        {formatNumber(opcion?.estimado ?? 0)}
                      </span>
                      <span className="text-xs text-text-soft">
                        créditos
                        {valor === estimado.k_por_defecto
                          ? " · Recomendado"
                          : ""}
                      </span>
                    </RadioPrimitive.Item>
                  );
                })}
              </RadioPrimitive.Root>
              <p className="text-xs text-text-soft">
                Con 1 repetición ves rápido qué falla. Más repeticiones detectan
                fallas que aparecen a veces. Tu límite actual es{" "}
                {formatNumber(estimado.k_maximo)}.
              </p>
            </div>

            <dl
              className="flex flex-col gap-2 rounded-lg border border-border-soft bg-bg-deep p-4 text-sm"
              aria-live="polite"
            >
              <div className="flex justify-between gap-4">
                <dt className="text-body">Estimado de la corrida</dt>
                <dd className="tabular-nums text-headline">
                  {creditos(fila.estimado)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-body">
                  Cubiertos por tu cuota gratis de pruebas
                </dt>
                <dd className="tabular-nums text-status-success-fg">
                  − {formatNumber(fila.de_la_cuota)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-border-soft pt-2 font-semibold text-headline">
                <dt>Se descontarán de tu saldo</dt>
                <dd className="tabular-nums">{creditos(fila.del_saldo)}</dd>
              </div>
              <div className="flex justify-between gap-4 text-xs text-text-soft">
                <dt>
                  {estimado.saldo === null
                    ? "Tu plan no mide créditos"
                    : `Saldo hoy ${creditos(estimado.saldo)}`}
                </dt>
                <dd className="tabular-nums">
                  {fila.saldo_despues === null || sinSaldo
                    ? ""
                    : `Quedarían ${formatNumber(fila.saldo_despues)}`}
                </dd>
              </div>
              <div className="text-xs text-text-soft">
                Te quedan {creditos(estimado.cuota_gratis_restante)} gratis de
                pruebas en este ciclo. Se comparten con el chat de prueba del
                agente.
              </div>
            </dl>

            <p className="text-xs text-text-soft">
              El estimado es un máximo: si la corrida llega a 1,5 veces este
              valor, se detiene y solo se cobra lo gastado.
            </p>

            {verCosto && fila.costo_usd != null && (
              <div className="flex flex-col gap-1 rounded-lg border border-focus/40 bg-surface p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-link">
                  Solo lo ve el master
                </p>
                <p className="text-sm text-body">
                  Costo real de IA para la plataforma con{" "}
                  {repeticionesEnPalabras(fila.k)}
                </p>
                <p className="font-display text-2xl font-semibold tabular-nums text-headline">
                  {formatUsd(fila.costo_usd, 2)}
                </p>
                <p className="text-xs text-text-soft">
                  Con las tarifas de modelo de ahora, antes de la cuota gratis.
                  El tope de repeticiones de este negocio es{" "}
                  {formatNumber(estimado.k_maximo)}.
                </p>
              </div>
            )}

            {sinSaldo && (
              <AvisoLimiteDePlan
                mensaje={
                  faltan > 0
                    ? `Te faltan ${creditos(faltan)}. Compra créditos o baja las repeticiones.`
                    : "Tu saldo no alcanza para esta corrida. Compra créditos o baja las repeticiones."
                }
                accion={
                  puedeComprar
                    ? { href: "/plan", label: "Comprar créditos" }
                    : null
                }
              />
            )}
            {aviso && (
              <p
                role="status"
                className="rounded-md bg-status-info-bg px-3 py-2 text-sm text-status-info-fg"
              >
                {aviso}
              </p>
            )}
            <FormFeedback error={error} />

            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => void confirmar()}
                loading={pending}
                disabled={sinSaldo || cargando}
              >
                Aprobar y probar
                {fila.del_saldo === 0
                  ? " · gratis"
                  : ` · ${creditos(fila.del_saldo)}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
