"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Progress } from "@/components/ui/progress";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type {
  PruebasArreglo,
  PruebasEscenarioInforme,
  PruebasInforme,
  PruebasIntento,
} from "@/lib/api/types";
import { formatNumber } from "@/lib/format";
import {
  avanceDeEscenario,
  corridaEnCurso,
  cuantosFallaron,
  ESTADO_DE_INTENTO,
  estadoDeCorrida,
  finDeIntento,
  motivoNoAplicable,
  ordenarPorFalla,
  porcentajeDeAvance,
  resultadoDeEscenario,
  rutaEnPalabras,
  TIPO_DE_ARREGLO,
  TITULO_DE_ARREGLO,
  valorDeCambio,
} from "@/lib/pruebas-del-agente";
import { rutaDePersonalizar } from "@/lib/rutas-de-agente";
import { cn } from "@/lib/utils";
import { useAction } from "@/lib/use-action";

import { llamar, rutaDePruebas } from "./llamar";

/** Cada cuánto se consulta el avance de una corrida viva. */
export const SONDEO_MS = 3000;

function Cifra({
  etiqueta,
  children,
  tono,
}: {
  etiqueta: string;
  children: React.ReactNode;
  tono?: "success" | "danger";
}) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-lg border border-border-soft bg-surface px-5 py-4">
      <span className="text-xs font-medium uppercase tracking-wide text-text-soft">
        {etiqueta}
      </span>
      <span
        className={cn(
          "font-display text-3xl font-bold tabular-nums",
          tono === "success" && "text-status-success-fg",
          tono === "danger" && "text-status-danger-fg",
          !tono && "text-headline",
        )}
      >
        {children}
      </span>
    </div>
  );
}

/**
 * La corrida: mientras corre, su avance en vivo (se consulta cada 3 segundos y sigue aunque salgas de la página);
 * al terminar, el informe con la conversación, la razón del juez y el arreglo sugerido de cada falla (HU-AOS-104/105).
 */
export function CorridaDePruebas({
  agenteId,
  nombre,
  inicial,
  puedeEditar,
  onVolver,
  onVolverAProbar,
}: {
  agenteId: string;
  nombre: string;
  inicial: PruebasInforme;
  puedeEditar: boolean;
  onVolver: () => void;
  onVolverAProbar: (corridaId: string, cuantas: number) => void;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { run, pending } = useAction({ refresh: false });
  const [informe, setInforme] = useState(inicial);
  const [errorDeSondeo, setErrorDeSondeo] = useState(false);
  const vivaAlEmpezar = useRef(corridaEnCurso(inicial.estado));
  const enCurso = corridaEnCurso(informe.estado);

  const recargar = useCallback(async () => {
    const res = await llamar<PruebasInforme>(
      rutaDePruebas(agenteId, `/corridas/${inicial.id}`),
    );
    if (res.ok) {
      setInforme(res.data);
      setErrorDeSondeo(false);
      return res.data;
    }
    setErrorDeSondeo(true);
    return null;
  }, [agenteId, inicial.id]);

  useEffect(() => {
    if (!enCurso) return;
    const t = setInterval(() => void recargar(), SONDEO_MS);
    return () => clearInterval(t);
  }, [enCurso, recargar]);

  // Cuando la corrida termina estando aquí, la lista y los resultados de las filas se ponen al día.
  useEffect(() => {
    if (vivaAlEmpezar.current && !enCurso) {
      vivaAlEmpezar.current = false;
      router.refresh();
    }
  }, [enCurso, router]);

  async function cancelar() {
    const ok = await confirm({
      title: "¿Cancelar la corrida?",
      description:
        "Se detiene y solo se cobra lo que ya se gastó. Lo que alcanzó a probar queda en el informe.",
      confirmLabel: "Cancelar corrida",
      cancelLabel: "Seguir probando",
    });
    if (!ok) return;
    await run(async () => {
      const res = await llamar(
        rutaDePruebas(agenteId, `/corridas/${informe.id}/cancelar`),
        "POST",
      );
      if (!res.ok)
        return {
          ok: false,
          status: res.status,
          error: res.error,
          code: res.code,
        };
      await recargar();
      return { ok: true, success: "Corrida cancelada." };
    });
  }

  const estado = estadoDeCorrida(informe.estado);
  const fallaron = cuantosFallaron(informe);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onVolver}>
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Volver a los escenarios
        </Button>
        <h2 className="flex-1 font-display text-sh-block text-headline">
          {enCurso ? `Probando a ${nombre}` : "Resultado de la corrida"}
        </h2>
        <Badge variant={estado.tono}>{estado.label}</Badge>
        {enCurso && puedeEditar && (
          <Button
            variant="outline"
            onClick={() => void cancelar()}
            loading={pending}
          >
            Cancelar corrida
          </Button>
        )}
        {!enCurso && puedeEditar && fallaron > 0 && (
          <Button onClick={() => onVolverAProbar(informe.id, fallaron)}>
            {fallaron === 1
              ? "Volver a probar la que falló"
              : `Volver a probar las ${formatNumber(fallaron)} que fallaron`}
          </Button>
        )}
      </div>

      {errorDeSondeo && enCurso && (
        <p
          role="status"
          className="rounded-md bg-status-warning-bg px-3 py-2 text-sm text-status-warning-fg"
        >
          No pudimos actualizar el avance. La corrida sigue; lo intentamos de
          nuevo en unos segundos.
        </p>
      )}

      {enCurso ? <Avance informe={informe} /> : <Resumen informe={informe} />}

      {enCurso ? (
        <TablaDeAvance informe={informe} />
      ) : (
        <InformeDetallado
          agenteId={agenteId}
          informe={informe}
          puedeEditar={puedeEditar}
          onCambio={recargar}
        />
      )}
    </div>
  );
}

function Avance({ informe }: { informe: PruebasInforme }) {
  const { hechos, total } = informe.progreso;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-soft bg-surface p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-3xl font-bold tabular-nums text-headline">
          {formatNumber(hechos)} de {formatNumber(total)}
        </span>
        <span className="flex-1 text-sm text-body">
          pruebas terminadas ·{" "}
          {informe.k === 1
            ? "1 repetición"
            : `${formatNumber(informe.k)} repeticiones`}{" "}
          por escenario
        </span>
        <span className="text-sm tabular-nums text-body">
          Gastado {formatNumber(Math.round(informe.creditos_reales))} de{" "}
          {formatNumber(Math.round(informe.creditos_estimados))} créditos
          estimados
        </span>
      </div>
      <Progress
        value={hechos}
        max={Math.max(total, 1)}
        label="Avance de la corrida"
        valueText={`${porcentajeDeAvance(informe)} %`}
      />
      <p className="text-xs text-text-soft">
        Puedes salir de esta página: la corrida sigue y el avance te espera
        aquí. Se detiene sola si pasa de{" "}
        {formatNumber(Math.round(informe.tope_creditos))} créditos.
      </p>
    </div>
  );
}

function TablaDeAvance({ informe }: { informe: PruebasInforme }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border-soft bg-surface">
      <table className="w-full text-sm">
        <caption className="sr-only">Avance de cada escenario</caption>
        <thead className="bg-hover text-xs uppercase tracking-wide text-body">
          <tr>
            <th scope="col" className="px-5 py-3 text-left font-medium">
              Escenario
            </th>
            <th scope="col" className="px-5 py-3 text-left font-medium">
              Estado
            </th>
            <th scope="col" className="px-5 py-3 text-left font-medium">
              Resultado
            </th>
          </tr>
        </thead>
        <tbody>
          {informe.escenarios.map((e) => {
            const avance = avanceDeEscenario(e, informe.k);
            const r = resultadoDeEscenario(e);
            const terminado = e.intentos.length >= informe.k;
            return (
              <tr key={e.case_id} className="border-t border-border-soft">
                <th
                  scope="row"
                  className="px-5 py-3 text-left font-normal text-headline"
                >
                  {e.titulo}
                </th>
                <td className="px-5 py-3 text-body">{avance.label}</td>
                <td className="px-5 py-3">
                  {terminado && r.estado !== "sin_probar" ? (
                    <Badge variant={r.tono}>{r.label}</Badge>
                  ) : (
                    <span className="text-text-soft">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Resumen({ informe }: { informe: PruebasInforme }) {
  const { pasan, fallan, no_se_pudo_probar, juez_equivocado, porcentaje } =
    informe.resumen;
  const juzgadas = pasan + fallan;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Cifra etiqueta="Pasaron" tono="success">
          {formatNumber(pasan)}{" "}
          <span className="text-sm font-normal text-body">
            de {formatNumber(juzgadas)}
            {porcentaje !== null ? ` · ${formatNumber(porcentaje)} %` : ""}
          </span>
        </Cifra>
        <Cifra etiqueta="Fallaron" tono={fallan > 0 ? "danger" : undefined}>
          {formatNumber(fallan)}
        </Cifra>
        <Cifra etiqueta="Costo">
          {formatNumber(Math.round(informe.creditos_reales))}{" "}
          <span className="text-sm font-normal text-body">
            créditos ·{" "}
            {formatNumber(Math.round(informe.creditos_reales_de_cuota))} de la
            cuota gratis
          </span>
        </Cifra>
      </div>
      {(no_se_pudo_probar > 0 || juez_equivocado > 0) && (
        <p className="text-sm text-text-soft">
          {no_se_pudo_probar > 0 &&
            (no_se_pudo_probar === 1
              ? "1 prueba no se pudo probar y no cuenta. "
              : `${formatNumber(no_se_pudo_probar)} pruebas no se pudieron probar y no cuentan. `)}
          {juez_equivocado > 0 &&
            (juez_equivocado === 1
              ? "Marcaste 1 prueba como «no es una falla»: no cuenta."
              : `Marcaste ${formatNumber(juez_equivocado)} pruebas como «no es una falla»: no cuentan.`)}
        </p>
      )}
    </div>
  );
}

function InformeDetallado({
  agenteId,
  informe,
  puedeEditar,
  onCambio,
}: {
  agenteId: string;
  informe: PruebasInforme;
  puedeEditar: boolean;
  onCambio: () => Promise<PruebasInforme | null>;
}) {
  const escenarios = ordenarPorFalla(informe.escenarios);
  const [elegido, setElegido] = useState<string | null>(null);
  const [intentoElegido, setIntentoElegido] = useState<number | null>(null);
  if (escenarios.length === 0) {
    return (
      <p className="text-sm text-text-soft">
        Esta corrida no alcanzó a probar ningún escenario.
      </p>
    );
  }
  const actual = escenarios.find((e) => e.case_id === elegido) ?? escenarios[0];
  // Si hay varias repeticiones, se abre primero una que falló.
  const intentos = actual.intentos;
  const primeraFalla =
    intentos.find((i) => i.estado === "falla" && !i.juez_equivocado) ??
    intentos[0];
  const intento =
    intentos.find((i) => i.intento === intentoElegido) ?? primeraFalla;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <nav
        aria-label="Escenarios de la corrida"
        className="overflow-hidden rounded-lg border border-border-soft bg-surface lg:w-80 lg:shrink-0"
      >
        <p className="bg-hover px-5 py-3 text-xs font-medium uppercase tracking-wide text-body">
          Escenarios
        </p>
        <ul>
          {escenarios.map((e) => {
            const r = resultadoDeEscenario(e);
            const activo = e.case_id === actual.case_id;
            return (
              <li
                key={e.case_id}
                className="border-t border-border-soft first:border-t-0"
              >
                <button
                  type="button"
                  aria-current={activo ? "true" : undefined}
                  onClick={() => {
                    setElegido(e.case_id);
                    setIntentoElegido(null);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-5 py-3 text-left text-sm transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2",
                    activo &&
                      (r.estado === "falla"
                        ? "bg-status-danger-bg"
                        : "bg-hover"),
                  )}
                >
                  <Badge variant={r.tono}>{r.label}</Badge>
                  <span className="min-w-0 flex-1 text-headline">
                    {e.titulo}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <DetalleDeEscenario
          agenteId={agenteId}
          informe={informe}
          escenario={actual}
          intento={intento}
          onElegirIntento={setIntentoElegido}
          puedeEditar={puedeEditar}
          onCambio={onCambio}
        />
      </div>
    </div>
  );
}

function DetalleDeEscenario({
  agenteId,
  informe,
  escenario,
  intento,
  onElegirIntento,
  puedeEditar,
  onCambio,
}: {
  agenteId: string;
  informe: PruebasInforme;
  escenario: PruebasEscenarioInforme;
  intento: PruebasIntento | undefined;
  onElegirIntento: (n: number) => void;
  puedeEditar: boolean;
  onCambio: () => Promise<PruebasInforme | null>;
}) {
  if (!intento) {
    return (
      <div className="rounded-lg border border-border-soft bg-surface p-5 text-sm text-text-soft">
        Este escenario no alcanzó a probarse en la corrida.
      </div>
    );
  }
  const estado = ESTADO_DE_INTENTO[intento.estado];
  const fin = finDeIntento(intento.fin);
  return (
    <>
      <div className="flex flex-col gap-3 rounded-lg border border-border-soft bg-surface p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="flex-1 font-display text-lg font-semibold text-headline">
            {escenario.titulo}
          </h3>
          <Badge variant={intento.juez_equivocado ? "neutral" : estado.tono}>
            {intento.juez_equivocado ? "No es una falla" : estado.label}
          </Badge>
        </div>
        {escenario.intentos.length > 1 && (
          <SegmentedControl
            label="Repetición"
            value={String(intento.intento)}
            className="self-start"
            options={escenario.intentos.map((i) => ({
              value: String(i.intento),
              label: `${i.intento}`,
            }))}
            onChange={(v) => onElegirIntento(Number(v))}
          />
        )}
        {intento.estado === "falla" && intento.razon && (
          <p className="text-sm text-body">
            <b className="font-medium text-headline">Por qué falló:</b>{" "}
            {intento.criterio_incumplido ? (
              <>el criterio «{intento.criterio_incumplido}» no se cumplió. </>
            ) : null}
            {intento.razon}
          </p>
        )}
        {intento.estado === "pasa" && intento.razon && (
          <p className="text-sm text-body">{intento.razon}</p>
        )}
        {intento.estado === "no_se_pudo_probar" && (
          <p className="text-sm text-body">
            {intento.razon ??
              "Una acción de este escenario no tiene simulador, así que no se pudo probar sin afectar tus datos. No cuenta como falla del agente."}
          </p>
        )}
        {fin && <p className="text-xs text-text-soft">{fin}</p>}
        <Conversacion intento={intento} />
        {intento.tools_llamadas.length > 0 && (
          <p className="text-xs text-text-soft">
            Acciones que usó el agente: {intento.tools_llamadas.join(", ")}.
          </p>
        )}
      </div>

      {intento.estado === "falla" && (
        <ArregloSugerido
          agenteId={agenteId}
          informe={informe}
          intento={intento}
          puedeEditar={puedeEditar}
          onCambio={onCambio}
        />
      )}
    </>
  );
}

function Conversacion({ intento }: { intento: PruebasIntento }) {
  if (intento.transcripcion.length === 0)
    return (
      <p className="text-sm text-text-soft">
        No quedó conversación para mostrar.
      </p>
    );
  return (
    <ol
      aria-label="Conversación simulada"
      className="flex flex-col gap-1.5 rounded-lg bg-bg-deep p-3 text-sm"
    >
      {intento.transcripcion.map((t, i) => (
        <li key={i} className="flex gap-2">
          <span
            className={cn(
              "w-16 shrink-0 font-medium",
              t.quien === "agente" ? "text-link" : "text-text-soft",
            )}
          >
            {t.quien === "agente" ? "Agente" : "Cliente"}
          </span>
          <span className="min-w-0 whitespace-pre-wrap text-headline">
            {t.texto}
          </span>
        </li>
      ))}
    </ol>
  );
}

function ArregloSugerido({
  agenteId,
  informe,
  intento,
  puedeEditar,
  onCambio,
}: {
  agenteId: string;
  informe: PruebasInforme;
  intento: PruebasIntento;
  puedeEditar: boolean;
  onCambio: () => Promise<PruebasInforme | null>;
}) {
  const confirm = useConfirm();
  const router = useRouter();
  const { run, pending } = useAction({ refresh: false });
  const arreglo: PruebasArreglo | null = intento.arreglo;

  async function aplicar() {
    if (!arreglo || informe.borrador_lock_version == null) return;
    const lock = informe.borrador_lock_version;
    const ok = await confirm({
      title: "¿Aplicar el arreglo al borrador?",
      description:
        "Se escribe en el borrador de tu agente, sin publicar: el agente que atiende a tus clientes no cambia hasta que publiques. Puedes revisarlo en Personalizar antes de publicar.",
      confirmLabel: "Aplicar al borrador",
      destructive: false,
    });
    if (!ok) return;
    await run(async () => {
      const res = await llamar(
        rutaDePruebas(agenteId, `/resultados/${intento.result_id}/aplicar`),
        "POST",
        { confirmo: true, lock_version: lock },
      );
      if (!res.ok) {
        // El borrador cambió o el arreglo ya no aplica: se muestra el informe al día.
        void onCambio();
        return {
          ok: false,
          status: res.status,
          error: res.error,
          code: res.code,
        };
      }
      await onCambio();
      router.refresh();
      return {
        ok: true,
        success:
          "Listo: el arreglo está en el borrador. Revísalo y publica cuando quieras.",
      };
    });
  }

  async function marcar(equivocado: boolean) {
    if (equivocado) {
      const ok = await confirm({
        title: "¿Esto no es una falla?",
        description:
          "La prueba deja de contar en el porcentaje y no se repite al volver a probar las que fallaron. Puedes deshacerlo después.",
        confirmLabel: "Sí, no es una falla",
        destructive: false,
      });
      if (!ok) return;
    }
    await run(async () => {
      const res = await llamar(
        rutaDePruebas(
          agenteId,
          `/resultados/${intento.result_id}/juez-equivocado`,
        ),
        "POST",
        { juez_equivocado: equivocado },
      );
      if (!res.ok)
        return {
          ok: false,
          status: res.status,
          error: res.error,
          code: res.code,
        };
      await onCambio();
      return {
        ok: true,
        success: equivocado
          ? "Listo: esta prueba ya no cuenta como falla."
          : "Listo: esta prueba vuelve a contar.",
      };
    });
  }

  if (intento.juez_equivocado) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border-soft bg-surface p-5 text-sm text-body">
        <span className="flex-1">
          Marcaste esta prueba como «no es una falla»: no cuenta en el
          resultado.
        </span>
        {puedeEditar && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void marcar(false)}
            loading={pending}
          >
            Volver a contarla
          </Button>
        )}
      </div>
    );
  }

  const aplicado = intento.arreglo_aplicado_en != null;
  const motivo = motivoNoAplicable(
    arreglo?.motivo_no_aplicable,
    arreglo?.seccion,
  );
  const puedeAplicar =
    puedeEditar &&
    arreglo?.aplicable === true &&
    informe.borrador_lock_version != null &&
    !aplicado;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-focus/40 bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-link">
        Arreglo sugerido
      </p>
      {!arreglo ? (
        <p className="text-sm text-body">
          Esta falla no trae un arreglo sugerido. Revisa la conversación y
          ajusta tu agente en Personalizar.
        </p>
      ) : (
        <>
          <p className="text-sm text-headline">
            {TITULO_DE_ARREGLO[arreglo.tipo]}
          </p>
          <p className="text-sm text-body">{arreglo.porque}</p>
          {arreglo.regla && (
            <p className="rounded-md border border-status-success-fg/30 bg-status-success-bg px-4 py-3 text-sm text-headline">
              <span className="font-semibold text-status-success-fg">
                + {TIPO_DE_ARREGLO.regla}{" "}
              </span>
              {arreglo.regla.phrases?.length
                ? arreglo.regla.phrases.join(" · ")
                : arreglo.regla.name}
            </p>
          )}
          {arreglo.texto && arreglo.tipo !== "regla" && (
            <p className="whitespace-pre-wrap rounded-md border border-status-success-fg/30 bg-status-success-bg px-4 py-3 text-sm text-headline">
              <span className="font-semibold text-status-success-fg">
                + {TIPO_DE_ARREGLO[arreglo.tipo]}{" "}
              </span>
              {arreglo.texto}
            </p>
          )}
          {arreglo.diff.length > 0 && (
            <ul
              aria-label="Lo que cambiaría en el borrador"
              className="flex flex-col gap-2 text-xs"
            >
              {arreglo.diff.map((c) => (
                <li key={c.ruta} className="rounded-md bg-bg-deep p-3">
                  <p className="mb-1 font-medium text-body">
                    {rutaEnPalabras(c.ruta)}
                  </p>
                  {c.antes !== null && c.antes !== undefined && (
                    <pre className="whitespace-pre-wrap text-status-danger-fg">
                      − {valorDeCambio(c.antes)}
                    </pre>
                  )}
                  <pre className="whitespace-pre-wrap text-status-success-fg">
                    + {valorDeCambio(c.despues)}
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {aplicado && (
        <p role="status" className="text-sm text-status-success-fg">
          Este arreglo ya está en el borrador.{" "}
          <Link
            className="underline underline-offset-2"
            href={rutaDePersonalizar(agenteId, { paso: "publicar" })}
          >
            Revisar y publicar
          </Link>
        </p>
      )}
      {!aplicado && motivo && (
        <p className="text-sm text-text-soft">{motivo}</p>
      )}
      {puedeEditar && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => void aplicar()}
            disabled={!puedeAplicar}
            loading={pending}
          >
            Aplicar al borrador
          </Button>
          <Button
            variant="outline"
            onClick={() => void marcar(true)}
            disabled={pending}
          >
            Esto no es una falla
          </Button>
          <span className="flex-1 text-right text-xs text-text-soft">
            No se publica solo: revisas el borrador y publicas tú.
          </span>
        </div>
      )}
    </div>
  );
}
