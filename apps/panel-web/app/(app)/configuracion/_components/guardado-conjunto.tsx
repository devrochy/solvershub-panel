"use client";

import { AlertCircle } from "lucide-react";

import { SECCIONES_DE_IDENTIDAD, seccionPorId, type SeccionId } from "@/lib/configuracion-secciones";
import { cn } from "@/lib/utils";

const TITULO_CORTO: Partial<Record<SeccionId, string>> = {
  identidad: "Identidad",
  horario: "Horario",
  voz: "Voz y estilo",
  calidad: "Calidad",
};

function nombrar(titulos: string[]): string {
  if (titulos.length === 1) return titulos[0];
  if (titulos.length === 2) return `${titulos[0]} y ${titulos[1]}`;
  return `${titulos.slice(0, -1).join(", ")} y ${titulos[titulos.length - 1]}`;
}

/**
 * El guardado compartido de Identidad, Horario, Voz y Calidad, a la vista. Estos formularios hacen un
 * solo PUT: si la persona cambió la voz y guarda desde Identidad, el cambio también entra. El rail lo
 * dice antes de pulsar y nombra la sección con error para que no haya que adivinar dónde está.
 */
export function GuardadoConjunto({
  seccionActual,
  seccionesSucias,
  seccionesConError,
  irASeccion,
}: {
  seccionActual: SeccionId;
  seccionesSucias: readonly SeccionId[];
  seccionesConError: readonly SeccionId[];
  irASeccion: (id: SeccionId) => void;
}) {
  const titulosSucios = SECCIONES_DE_IDENTIDAD.filter((id) => seccionesSucias.includes(id)).map(
    (id) => seccionPorId(id).titulo,
  );
  const titulosConError = SECCIONES_DE_IDENTIDAD.filter((id) => seccionesConError.includes(id)).map(
    (id) => seccionPorId(id).titulo,
  );

  return (
    <section
      aria-labelledby="guardado-conjunto"
      className={cn(
        "rounded-lg border px-3.5 py-3",
        titulosConError.length > 0
          ? "border-status-danger-border bg-status-danger-bg"
          : titulosSucios.length > 0
            ? "border-focus/40 bg-focus/10"
            : "border-border-soft bg-surface-2",
      )}
    >
      <h3 id="guardado-conjunto" className="text-sm font-semibold text-headline">
        Guardado conjunto
      </h3>
      <p className="mt-0.5 text-sh-label text-text-soft">
        Estas cuatro secciones se guardan con un solo envío.
      </p>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {SECCIONES_DE_IDENTIDAD.map((id) => {
          const actual = id === seccionActual;
          const sucia = seccionesSucias.includes(id);
          const conError = seccionesConError.includes(id);
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => irASeccion(id)}
                aria-current={actual ? "true" : undefined}
                aria-label={`Ir a ${seccionPorId(id).titulo}${conError ? ", tiene un error" : sucia ? ", tiene cambios sin guardar" : ""}`}
                className={cn(
                  "inline-flex min-h-7 items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                  conError
                    ? "border-status-danger-border bg-status-danger-bg text-status-danger-fg"
                    : sucia || actual
                      ? "border-focus/40 bg-surface text-headline hover:bg-hover"
                      : "border-border-soft bg-surface text-body hover:bg-hover",
                )}
              >
                {conError ? (
                  <AlertCircle aria-hidden className="h-3 w-3 shrink-0" />
                ) : (
                  <span
                    aria-hidden
                    className={cn("h-1.5 w-1.5 shrink-0 rounded-full", sucia || actual ? "bg-focus" : "bg-text-soft")}
                  />
                )}
                {TITULO_CORTO[id] ?? seccionPorId(id).titulo}
                {actual && <span className="font-normal text-text-soft">· aquí</span>}
                {conError && <span className="sr-only">error</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-2.5 text-sh-label text-body">
        {titulosConError.length > 0 ? (
          <>
            Hay un campo por revisar en <b className="font-semibold text-status-danger-fg">{nombrar(titulosConError)}</b>.
            Corrígelo antes de guardar; lo demás se conserva.
          </>
        ) : titulosSucios.length > 0 ? (
          <>
            Hay cambios sin guardar en <b className="font-semibold text-headline">{nombrar(titulosSucios)}</b>. Si
            guardas aquí, también {titulosSucios.length === 1 ? "se guarda ese cambio" : "se guardan esos cambios"}.
          </>
        ) : (
          "Todo guardado. Los cambios de nombre, descripción y voz se aplican al publicar una versión nueva del agente."
        )}
      </p>
    </section>
  );
}
