import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * Glifos de la marca para marcar lo hecho en el recorrido del agente (SPEC-52). Llevan el degradado de
 * la marca (`#2F6BFF → #22C7E0`) en los dos temas, como el logo y el favicon. El id del degradado sale de
 * `useId`: hay varias copias en la misma página (las estaciones del stepper, las preguntas respondidas,
 * el catálogo en claro y oscuro) y un id repetido haría que todas pinten el degradado de la primera.
 *
 * Son decorativos (`aria-hidden`): quien los usa dice con texto qué marcan («, hecho», «Respondida»).
 */

/** La V del wordmark de SolversHub: la estación hecha en `BarraDePasos forma="estaciones"` (D-SPEC-52-4). */
export function VDeLaMarca({ className }: { className?: string }) {
  const degradado = useId();
  return (
    <svg aria-hidden viewBox="-84 488 188 168" className={cn("block", className)} focusable="false">
      <defs>
        <linearGradient id={degradado} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2F6BFF" />
          <stop offset="1" stopColor="#22C7E0" />
        </linearGradient>
      </defs>
      <path
        d="M-78.39 532.5L-51.77 532.5A16 16 0 0 1 -37.58 541.11L0 613.31L57.75 502.36A16 16 0 0 1 71.95 493.75L98.56 493.75A1.5 1.5 0 0 1 99.9 495.94L20.23 648.97A22.81 22.81 0 0 1 -20.23 648.97L-79.72 534.69A1.5 1.5 0 0 1 -78.39 532.5Z"
        fill={`url(#${degradado})`}
      />
    </svg>
  );
}

/** El favicon de SolversHub (la idea con el check): la pregunta respondida en `PreguntaDelRecorrido` (D-SPEC-52-1). */
export function FaviconDeLaMarca({ className }: { className?: string }) {
  const degradado = useId();
  const relleno = `url(#${degradado})`;
  return (
    <svg aria-hidden viewBox="-188.3 116.4 376.6 376.6" className={cn("block", className)} focusable="false">
      <defs>
        <linearGradient id={degradado} gradientUnits="userSpaceOnUse" x1="-170" y1="120" x2="170" y2="470">
          <stop offset="0" stopColor="#2F6BFF" />
          <stop offset="1" stopColor="#22C7E0" />
        </linearGradient>
      </defs>
      <path
        d="M0 152.34 A40.95 40.95 0 0 1 77.81 157.99 A44.35 44.35 0 0 1 135.34 216.27 A46.4 46.4 0 0 1 139.33 301.53 A43.25 43.25 0 0 1 76.3 356.06 L50.36 382 A20 20 0 0 0 44.5 396.14 L44.5 405.35 A2 2 0 0 1 42.5 407.35 L-42.5 407.35 A2 2 0 0 1 -44.5 405.35 L-44.5 396.14 A20 20 0 0 0 -50.36 382 L-76.3 356.06 A43.25 43.25 0 0 1 -139.33 301.53 A46.4 46.4 0 0 1 -135.34 216.27 A44.35 44.35 0 0 1 -77.81 157.99 A40.95 40.95 0 0 1 0 152.34 Z"
        fill={relleno}
        stroke={relleno}
        strokeWidth="12.5"
        strokeLinejoin="round"
      />
      <path d="M-46 437H46M-26 476H26" fill="none" stroke={relleno} strokeWidth="26" strokeLinecap="round" />
      <path
        d="M-52.5 298.34L-16.54 334.3L54.77 262.55"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="26.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
