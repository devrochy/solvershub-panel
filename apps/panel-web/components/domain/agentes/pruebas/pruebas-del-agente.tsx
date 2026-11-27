"use client";

import { useState } from "react";

import { useConfirm } from "@/components/ui/confirm";
import type {
  EscenariosDePrueba,
  EscenariosPropuestos,
  PruebasInforme,
} from "@/lib/api/types";
import { creditos } from "@/lib/consumo";
import { formatNumber } from "@/lib/format";
import { corridaEnCurso } from "@/lib/pruebas-del-agente";
import { useAction } from "@/lib/use-action";

import { CorridaDePruebas } from "./corrida-de-pruebas";
import { ListaDeEscenarios } from "./lista-de-escenarios";
import { llamar, rutaDePruebas } from "./llamar";
import { ProbarDialog, type QueProbar } from "./probar-dialog";

type Vista = { tipo: "lista" } | { tipo: "corrida"; informe: PruebasInforme };

/**
 * Pestaña «Pruebas» de la ficha del agente (SPEC-53, HU-AOS-105): proponer o escribir escenarios, aprobar el
 * costo, correr y ver el resultado en un solo lugar. Los datos vienen del servidor; aquí solo vive qué pantalla
 * se mira y el diálogo abierto.
 */
export function PruebasDelAgente({
  agenteId,
  nombre,
  datos,
  ultimoInforme,
  cuotaGratisRestante,
  puedeEditar,
  puedeComprar,
  verCosto,
}: {
  agenteId: string;
  nombre: string;
  datos: EscenariosDePrueba;
  ultimoInforme: PruebasInforme | null;
  /** Créditos gratis de pruebas que le quedan al negocio en el ciclo; `null` si no se pudo saber. */
  cuotaGratisRestante: number | null;
  puedeEditar: boolean;
  puedeComprar: boolean;
  verCosto: boolean;
}) {
  const confirm = useConfirm();
  const { run, pending: proponiendo } = useAction();
  // Una corrida en marcha se abre sola: el dueño vuelve y ve dónde va.
  const [vista, setVista] = useState<Vista>(
    ultimoInforme && corridaEnCurso(ultimoInforme.estado)
      ? { tipo: "corrida", informe: ultimoInforme }
      : { tipo: "lista" },
  );
  const [probar, setProbar] = useState<QueProbar | null>(null);

  async function proponer() {
    const ok = await confirm({
      title: "¿Pedir pruebas a la IA?",
      description:
        "La IA lee cómo está configurado tu agente y propone hasta 10 escenarios en borrador. Cuesta unos pocos créditos, como una respuesta del agente: primero se usa tu cuota gratis de pruebas.",
      confirmLabel: "Proponer pruebas",
      destructive: false,
    });
    if (!ok) return;
    await run(async () => {
      const res = await llamar<EscenariosPropuestos>(
        rutaDePruebas(agenteId, "/proponer"),
        "POST",
      );
      if (!res.ok)
        return {
          ok: false,
          status: res.status,
          error: res.error,
          code: res.code,
        };
      const n = res.data.escenarios.length;
      return {
        ok: true,
        success:
          n === 0
            ? "La IA no encontró escenarios nuevos que proponer."
            : `Propusimos ${formatNumber(n)} ${n === 1 ? "escenario" : "escenarios"} en borrador${res.data.creditos ? ` (${creditos(res.data.creditos)})` : ""}.`,
      };
    });
  }

  async function abrirUltima() {
    if (ultimoInforme) setVista({ tipo: "corrida", informe: ultimoInforme });
  }

  return (
    <div className="flex flex-col gap-6">
      {vista.tipo === "corrida" ? (
        <CorridaDePruebas
          key={vista.informe.id}
          agenteId={agenteId}
          nombre={nombre}
          inicial={vista.informe}
          puedeEditar={puedeEditar}
          onVolver={() => setVista({ tipo: "lista" })}
          onVolverAProbar={(runId, cuantas) =>
            setProbar({ tipo: "fallidas", runId, cuantas })
          }
        />
      ) : (
        <>
          {/* Sin escenarios, el estado vacío ya es la bienvenida: no se repite el título. */}
          {datos.escenarios.length > 0 && (
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="flex flex-1 flex-col gap-1 rounded-lg border border-border-soft bg-surface p-5">
                <h2 className="font-display text-lg font-semibold text-headline">
                  Pon a prueba a tu agente
                </h2>
                <p className="text-sm text-body">
                  Simulamos clientes reales en un entorno de prueba. Nada se
                  envía a nadie ni toca tus datos. Ves qué falla y cómo
                  arreglarlo.
                </p>
                {ultimoInforme && (
                  <p className="mt-2 text-sm">
                    <button
                      type="button"
                      onClick={() => void abrirUltima()}
                      className="text-link underline underline-offset-2"
                    >
                      {corridaEnCurso(ultimoInforme.estado)
                        ? "Ver el avance de la corrida"
                        : "Ver el informe de la última corrida"}
                    </button>
                  </p>
                )}
              </div>
              {cuotaGratisRestante !== null && (
                <div className="flex flex-col gap-1 rounded-lg border border-border-soft bg-surface p-5 lg:w-80">
                  <span className="text-xs font-medium uppercase tracking-wide text-text-soft">
                    Cuota gratis del ciclo
                  </span>
                  <span className="font-display text-3xl font-bold tabular-nums text-headline">
                    {formatNumber(cuotaGratisRestante)}{" "}
                    <span className="text-sm font-normal text-body">
                      créditos
                    </span>
                  </span>
                  <span className="text-xs text-text-soft">
                    Se comparte con el chat de prueba. Luego se descuenta de tu
                    saldo.
                  </span>
                </div>
              )}
            </div>
          )}
          <ListaDeEscenarios
            agenteId={agenteId}
            escenarios={datos.escenarios}
            tope={datos.tope}
            ultimoInforme={ultimoInforme}
            puedeEditar={puedeEditar}
            proponiendo={proponiendo}
            onProponer={() => void proponer()}
            onProbar={(caseIds) => setProbar({ tipo: "escenarios", caseIds })}
          />
        </>
      )}

      {probar && (
        <ProbarDialog
          agenteId={agenteId}
          que={probar}
          open
          onOpenChange={(o) => !o && setProbar(null)}
          verCosto={verCosto}
          puedeComprar={puedeComprar}
          onLanzada={async (corrida) => {
            const res = await llamar<PruebasInforme>(
              rutaDePruebas(agenteId, `/corridas/${corrida.id}`),
            );
            if (res.ok) setVista({ tipo: "corrida", informe: res.data });
          }}
        />
      )}
    </div>
  );
}
