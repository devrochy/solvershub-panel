import type { ReactNode } from "react";
import { Ban, Check, MinusCircle, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type StepState = "upcoming" | "current" | "complete" | "error" | "warning" | "skipped";

export type StepItem = {
  id: string;
  title: ReactNode;
  /** Línea secundaria (p. ej. el resultado esperado). */
  description?: ReactNode;
  state: StepState;
  /** Texto del estado para lectores de pantalla y como etiqueta visible. */
  stateLabel?: string;
  /** Contenido del paso abierto (controles, notas…). */
  content?: ReactNode;
};

const MARCADOR: Record<StepState, string> = {
  upcoming: "border-border-strong text-text-soft",
  current: "border-focus bg-focus/10 text-headline",
  complete: "border-status-success-border bg-status-success-bg text-status-success-fg",
  error: "border-status-danger-border bg-status-danger-bg text-status-danger-fg",
  warning: "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
  skipped: "border-border-soft bg-hover text-text-soft",
};

const ICONO: Partial<Record<StepState, ReactNode>> = {
  complete: <Check aria-hidden className="h-3.5 w-3.5" />,
  error: <X aria-hidden className="h-3.5 w-3.5" />,
  warning: <Ban aria-hidden className="h-3.5 w-3.5" />,
  skipped: <MinusCircle aria-hidden className="h-3.5 w-3.5" />,
};

/**
 * Lista de pasos numerados (HU-QA-03, sale del `Paso` de «Pasar a producción»). Cada paso
 * muestra su estado con ícono y texto; el activo lleva `aria-current="step"` y su contenido.
 * Un paso se abre con `onSelect` (clic en la cabecera): el contenedor decide cuál es el activo.
 */
export function Stepper({
  steps,
  onSelect,
  label,
  className,
}: {
  steps: StepItem[];
  onSelect?: (id: string) => void;
  label: string;
  className?: string;
}) {
  return (
    <ol aria-label={label} className={cn("flex flex-col", className)}>
      {steps.map((step, index) => {
        const activo = step.state === "current";
        const ultimo = index === steps.length - 1;
        const cabecera = (
          <>
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                MARCADOR[step.state],
              )}
            >
              {ICONO[step.state] ?? index + 1}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
              <span className={cn("text-sm", activo ? "font-medium text-headline" : "text-body")}>{step.title}</span>
              {step.description && <span className="text-xs text-text-soft">{step.description}</span>}
            </span>
            {step.stateLabel && step.state !== "upcoming" && step.state !== "current" && (
              <span className="shrink-0 text-xs text-text-soft">{step.stateLabel}</span>
            )}
          </>
        );
        return (
          <li key={step.id} aria-current={activo ? "step" : undefined} className="relative flex gap-3 pb-4">
            {!ultimo && (
              <span aria-hidden className="absolute left-3.5 top-8 bottom-0 w-px bg-border-soft" />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              {onSelect && !activo ? (
                <button
                  type="button"
                  onClick={() => onSelect(step.id)}
                  className="flex items-start gap-3 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2"
                  aria-label={`Paso ${index + 1}${step.stateLabel ? `, ${step.stateLabel}` : ""}`}
                >
                  {cabecera}
                </button>
              ) : (
                <div className="flex items-start gap-3">{cabecera}</div>
              )}
              {activo && step.content && <div className="pl-10">{step.content}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
