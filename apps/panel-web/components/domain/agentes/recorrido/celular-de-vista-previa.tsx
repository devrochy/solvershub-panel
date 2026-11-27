"use client";

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";

import type { TipoDeNegocio } from "@/lib/onboarding";
import type { EstacionDeLaRuta } from "@/lib/ruta-de-lanzamiento";
import { cn } from "@/lib/utils";
import type { CargadoDeVistaPrevia, FrasePropiaDePrueba } from "@/lib/vista-previa";

import { CajaSinEscribir, ChatDeVistaPrevia } from "./vista-previa-whatsapp";

/** La leyenda del celular: el chat es una vista previa y los canales se conectan después. */
export const LEYENDA_DEL_CELULAR = "Vista previa: no le escribe a nadie. Conectas tus canales después.";

/**
 * El celular del recorrido del agente (HU-UX-26, D-SPEC-52-2, tablero `CelularCanales`): el chat simulado de la
 * estación (`ChatDeVistaPrevia`) dentro de un teléfono, sobre un fondo suave de nodos unidos a los 8 canales
 * (WhatsApp, Web, Instagram, Correo, Catálogo, Agenda, Pagos y CRM). El fondo es adorno (`aria-hidden`).
 *
 * Va a la derecha de la ruta desde 1280 px y, por debajo, dentro del panel lateral de `BurbujaDePrueba`. El
 * teléfono no pasa de 440 px de ancho y se achica para caber en el alto de la pantalla.
 *
 * Sin `tipo` o sin `estacion` no hay chat (todavía no hay tipo, o la estación prueba de verdad en otro lado):
 * el teléfono muestra `sinChat`. `aviso` es una línea que flota sobre la caja de texto («Escribe aquí para
 * probar a Laura»), dentro del celular para que el borde de la pantalla no la corte; se cierra con su × o al
 * tocar una frase.
 */
export function CelularDeVistaPrevia({
  tipo,
  estacion,
  agente,
  negocio,
  cargados,
  sinChat = "Elige qué hará tu agente para verlo responder aquí.",
  aviso,
  onCerrarAviso,
  frasesPropias,
  className,
}: {
  tipo: TipoDeNegocio | null | undefined;
  estacion?: EstacionDeLaRuta;
  agente: string;
  negocio: string;
  cargados?: readonly CargadoDeVistaPrevia[];
  sinChat?: ReactNode;
  aviso?: string;
  onCerrarAviso?: () => void;
  /** Frases propias del dueño para probar (estación 2, HU-UX-28); no reinician la conversación. */
  frasesPropias?: readonly FrasePropiaDePrueba[];
  className?: string;
}) {
  const [avisoCerrado, setAvisoCerrado] = useState(false);
  const verAviso = Boolean(aviso) && !avisoCerrado;
  function cerrarAviso() {
    setAvisoCerrado(true);
    onCerrarAviso?.();
  }

  return (
    <section
      aria-label="Vista previa del agente en el celular"
      className={cn("relative flex w-full flex-col items-center gap-4 overflow-hidden rounded-xl px-6 pb-6 pt-8", className)}
      // Los `--sh-*` del tema (no los `--color-*`, que se resuelven en `:root`) para seguir un `data-theme` anidado.
      style={{
        background:
          "radial-gradient(circle at 12% 8%, color-mix(in oklab, var(--sh-focus) 20%, transparent), transparent 42%)," +
          "radial-gradient(circle at 92% 38%, color-mix(in oklab, var(--sh-data-cat-3) 16%, transparent), transparent 46%)," +
          "radial-gradient(circle at 30% 96%, color-mix(in oklab, var(--sh-blue-600) 16%, transparent), transparent 48%)," +
          "var(--sh-bg-deep)",
      }}
    >
      <div
        className="relative aspect-[440/860]"
        // Hasta 440 px de ancho y nunca más alto que la pantalla, descontando encabezado, stepper y pie
        // (`--celular-reserva`; el panel lateral de la burbuja reserva menos).
        style={{ width: "min(100%, 440px, calc((100dvh - var(--celular-reserva, 18rem)) * 440 / 860))" }}
      >
        <FondoDeCanales />
        <div className="absolute left-[18.6%] top-[15.1%] flex h-[70%] w-[62.8%] rounded-[2.25rem] border-2 border-border-strong bg-bg-deep p-2.5 shadow-elev-3">
          {tipo && estacion ? (
            <ChatDeVistaPrevia
              key={`${tipo}:${estacion}:${agente}:${cargados?.length ?? 0}`}
              enCelular
              tipo={tipo}
              estacion={estacion}
              agente={agente}
              negocio={negocio}
              cargados={cargados}
              onProbar={verAviso ? cerrarAviso : undefined}
              frasesPropias={frasesPropias}
              className="min-w-0 flex-1"
            />
          ) : (
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] bg-surface">
              <div className="flex flex-1 items-center justify-center p-5 text-center text-sm text-body">{sinChat}</div>
              <div className="border-t border-border-soft px-3 py-2.5">
                <CajaSinEscribir />
              </div>
            </div>
          )}
        </div>
        {verAviso && (
          <div
            role="status"
            className="absolute bottom-[calc(14.9%+4.625rem)] left-[16%] z-10 inline-flex max-w-[80%] items-center gap-2 rounded-full bg-focus py-2 pl-3.5 pr-2 text-[0.8125rem] font-semibold text-surface shadow-elev-3"
          >
            <span className="truncate">{aviso}</span>
            <button
              type="button"
              onClick={cerrarAviso}
              aria-label="Cerrar aviso"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface/15 hover:bg-surface/25"
            >
              <X className="h-3 w-3" strokeWidth={3} aria-hidden />
            </button>
            <span aria-hidden className="absolute -bottom-1 left-10 h-2.5 w-2.5 rotate-45 bg-focus" />
          </div>
        )}
      </div>
      <p className="text-center text-xs text-text-soft">{LEYENDA_DEL_CELULAR}</p>
    </section>
  );
}

const CANALES: readonly { x: number; y: number; etiqueta: string; dy: number; color: string; icono: ReactNode }[] = [
  { x: 70, y: 62, etiqueta: "WhatsApp", dy: 40, color: "stroke-focus", icono: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /> },
  {
    x: 220,
    y: 62,
    etiqueta: "Web",
    dy: 40,
    color: "stroke-data-1",
    icono: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20" />
      </>
    ),
  },
  {
    x: 370,
    y: 62,
    etiqueta: "Instagram",
    dy: 40,
    color: "stroke-data-3",
    icono: (
      <>
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
      </>
    ),
  },
  {
    x: 36,
    y: 330,
    etiqueta: "Correo",
    dy: 40,
    color: "stroke-focus",
    icono: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 6L2 7" />
      </>
    ),
  },
  {
    x: 404,
    y: 520,
    etiqueta: "Catálogo",
    dy: 40,
    color: "stroke-data-3",
    icono: <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0" />,
  },
  {
    x: 70,
    y: 800,
    etiqueta: "Agenda",
    dy: 40,
    color: "stroke-data-1",
    icono: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </>
    ),
  },
  {
    x: 220,
    y: 800,
    etiqueta: "Pagos",
    dy: 40,
    color: "stroke-focus",
    icono: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </>
    ),
  },
  {
    x: 370,
    y: 800,
    etiqueta: "CRM",
    dy: 40,
    color: "stroke-data-3",
    icono: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87" />
        <circle cx="9" cy="7" r="4" />
      </>
    ),
  },
];

/** La red de nodos y los 8 canales alrededor del teléfono (tablero `CelularCanales`, estilo «nodos»). */
function FondoDeCanales() {
  return (
    <svg aria-hidden viewBox="0 0 440 860" className="pointer-events-none absolute inset-0 h-full w-full" focusable="false">
      <g className="stroke-text-soft" strokeOpacity="0.3" strokeWidth="1" fill="none">
        <path d="M20 200 L130 20 L310 24 L430 250 L425 700 L310 845 L120 850 L15 600 Z" />
        <path d="M130 20 L220 62 L310 24 M15 600 L36 330 L20 200 M425 700 L404 520 L430 250" />
      </g>
      <g fill="none" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 5" strokeOpacity="0.6">
        <path className="stroke-focus" d="M70 84 C70 110, 160 104, 160 130" />
        <path className="stroke-data-1" d="M220 84 L220 130" />
        <path className="stroke-data-3" d="M370 84 C370 110, 280 104, 280 130" />
        <path className="stroke-data-1" d="M70 778 C70 752, 160 758, 160 732" />
        <path className="stroke-focus" d="M220 778 L220 732" />
        <path className="stroke-data-3" d="M370 778 C370 752, 280 758, 280 732" />
        <path className="stroke-focus" d="M58 330 C70 330, 70 380, 82 380" />
        <path className="stroke-data-3" d="M382 520 C370 520, 370 470, 358 470" />
      </g>
      {CANALES.map((c) => (
        <g key={c.etiqueta}>
          <circle cx={c.x} cy={c.y} r="22" strokeWidth="1.5" strokeOpacity="0.7" className={cn("fill-surface", c.color)} />
          <g
            transform={`translate(${c.x - 10} ${c.y - 10}) scale(0.833)`}
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-link"
          >
            {c.icono}
          </g>
          <text x={c.x} y={c.y + c.dy} textAnchor="middle" fontSize="11" className="fill-text-soft">
            {c.etiqueta}
          </text>
        </g>
      ))}
    </svg>
  );
}
