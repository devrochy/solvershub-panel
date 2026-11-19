"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { BarraDePasos, type PasoDeLaBarra } from "@/components/ui/barra-de-pasos";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MensajeDeVistaPrevia } from "@/lib/vista-previa";

import { HojaDeVistaPrevia, VistaPreviaWhatsApp, type SugerenciaDeVistaPrevia } from "./vista-previa-whatsapp";

export type AccionDelPie = {
  texto: string;
  onClick: () => void;
  cargando?: boolean;
  deshabilitado?: boolean;
};

export type VistaPreviaDelPaso = {
  negocio: string;
  agente: string;
  subtitulo?: string;
  mensajes: readonly MensajeDeVistaPrevia[];
  sugerencias?: readonly SugerenciaDeVistaPrevia[];
};

/**
 * Cascarón común del recorrido del agente (HU-UX-22, SPEC-47): la bienvenida, Nuevo agente y Editar
 * lo usan con los mismos pasos. Arriba la barra de avance, luego la pregunta del paso como único `h1`,
 * el contenido y, a la derecha, el teléfono con la vista previa (hoja inferior por debajo de `lg`).
 * El pie queda pegado abajo: «Atrás», la acción principal y, al editar, «Guardar cambios».
 *
 * No guarda ni navega por su cuenta: cada flujo decide qué hace cada botón.
 *
 * `disposicion="ruta"` es la ruta de lanzamiento (HU-UX-24, SPEC-49): la barra pasa a estaciones
 * (con `extremo` a su derecha, por ejemplo «Seguir después»), la pregunta lleva encima el eyebrow
 * «Paso N de M · {estación}» y debajo su `bajada`, con el título de 36 px desde `md` (`text-sh-ruta`),
 * y el pie suma la línea `queSigue`. A la derecha va `lateral` (el escenario en tarjeta) en lugar del
 * teléfono, cuando el propio recorrido mide al menos 56 rem (consulta de contenedor: dentro del shell
 * cuenta el ancho que deja el menú, no el de la ventana). El escenario a pantalla completa de la bienvenida lo compone la página, fuera del cascarón.
 */
export function RecorridoDelAgente({
  pasos,
  actual,
  modo,
  onIr,
  etiquetaDePasos = "Pasos del agente",
  pregunta,
  nivelDePregunta = "h1",
  vistaPrevia,
  atras,
  guardar,
  principal,
  dentroDelPanel = false,
  disposicion = "pasos",
  bajada,
  queSigue,
  extremo,
  lateral,
  children,
  className,
}: {
  pasos: readonly PasoDeLaBarra[];
  actual: string;
  modo: "en-orden" | "libre";
  onIr?: (id: string) => void;
  etiquetaDePasos?: string;
  pregunta: string;
  /** `h2` cuando la página ya tiene su `PageHeader` con el único `h1` (dentro del shell). */
  nivelDePregunta?: "h1" | "h2";
  vistaPrevia?: VistaPreviaDelPaso;
  atras?: AccionDelPie;
  guardar?: AccionDelPie;
  /** Sin acción principal (solo lectura), el pie solo deja moverse con «Atrás». */
  principal?: AccionDelPie;
  /**
   * Dentro del shell del panel: su `main` tiene relleno abajo (24 px, 32 px desde `md`) y el pie
   * pegado se estira hasta el borde para no dejar ver el contenido por debajo.
   */
  dentroDelPanel?: boolean;
  /** `ruta`: estaciones, eyebrow, título grande, bajada y «qué sigue» (HU-UX-24). */
  disposicion?: "pasos" | "ruta";
  /** Debajo de la pregunta (solo en `ruta`). */
  bajada?: string;
  /** Al lado de la acción principal, por ejemplo «Sigue: Habilidades.» (solo en `ruta`). */
  queSigue?: string;
  /** A la derecha de la ruta de estaciones (solo en `ruta`). */
  extremo?: ReactNode;
  /** Columna derecha de 340 px en lugar del teléfono (solo en `ruta`), por ejemplo `EscenarioTarjeta`. */
  lateral?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const ruta = disposicion === "ruta";
  const indice = Math.max(
    0,
    pasos.findIndex((p) => p.id === actual),
  );
  const pasoActual = pasos[indice];
  const eyebrow = pasoActual ? `Paso ${indice + 1} de ${pasos.length} · ${pasoActual.corto ?? pasoActual.titulo}` : "";
  const conLateral = ruta && Boolean(lateral);
  const titulo = useRef<HTMLHeadingElement>(null);
  const Pregunta = nivelDePregunta;
  const primero = useRef(true);
  useEffect(() => {
    // Al cambiar de paso el foco va a la pregunta; al montar no se roba el foco.
    if (primero.current) {
      primero.current = false;
      return;
    }
    titulo.current?.focus();
  }, [actual]);

  return (
    <div className={cn("flex min-h-full flex-col", ruta && "@container", className)}>
      <div className="flex flex-1 flex-col gap-6">
        {ruta ? (
          <div className="flex items-start justify-between gap-4">
            <BarraDePasos
              pasos={pasos}
              actual={actual}
              modo={modo}
              onIr={onIr}
              etiqueta={etiquetaDePasos}
              forma="estaciones"
              className="min-w-0 flex-1"
            />
            {extremo && <div className="shrink-0">{extremo}</div>}
          </div>
        ) : (
          <BarraDePasos pasos={pasos} actual={actual} modo={modo} onIr={onIr} etiqueta={etiquetaDePasos} />
        )}
        <div
          className={cn(
            "grid flex-1 gap-10",
            conLateral ? "@4xl:grid-cols-[minmax(0,1fr)_21.25rem]" : vistaPrevia && "lg:grid-cols-[minmax(0,1fr)_21rem]",
          )}
        >
          <div className={cn("flex min-w-0 flex-col pb-6", ruta ? "gap-6" : "gap-8")}>
            {ruta ? (
              <div className="flex flex-col gap-2">
                <p className="hidden text-sm font-semibold text-link md:block">{eyebrow}</p>
                <Pregunta
                  ref={titulo}
                  tabIndex={-1}
                  className="font-display text-sh-h1 text-headline outline-none md:text-sh-ruta"
                >
                  {pregunta}
                </Pregunta>
                {bajada && <p className="max-w-2xl text-base text-body md:text-lg">{bajada}</p>}
              </div>
            ) : (
              <Pregunta ref={titulo} tabIndex={-1} className="font-display text-sh-h1 text-headline outline-none">
                {pregunta}
              </Pregunta>
            )}
            {children}
          </div>
          {conLateral ? (
            <div className="sticky top-6 hidden self-start @4xl:flex">{lateral}</div>
          ) : (
            vistaPrevia && <VistaPreviaWhatsApp {...vistaPrevia} className="sticky top-6 hidden self-start lg:flex" />
          )}
        </div>
      </div>
      <div
        className={cn(
          "sticky bottom-0 z-10 -mx-4 md:-mx-6",
          dentroDelPanel && "-bottom-6 -mb-6 md:-bottom-8 md:-mb-8",
        )}
      >
        {vistaPrevia && <HojaDeVistaPrevia {...vistaPrevia} className="lg:hidden" />}
        <footer className="flex items-center justify-between gap-2 border-t border-border-soft bg-surface px-4 py-3 sm:gap-3 md:px-6">
          <div className="shrink-0">
            {atras && (
              <Button
                variant="outline"
                size="lg"
                onClick={atras.onClick}
                disabled={atras.deshabilitado || atras.cargando}
                className="px-3 sm:px-5"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {/* En el celular solo la flecha: el nombre sigue para el lector de pantalla. */}
                <span className="sr-only sm:not-sr-only">{atras.texto}</span>
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {guardar && (
              <Button
                variant="outline"
                size="lg"
                onClick={guardar.onClick}
                loading={guardar.cargando}
                disabled={guardar.deshabilitado}
              >
                {guardar.texto}
              </Button>
            )}
            {principal && (
              <Button
                variant="accent"
                size="lg"
                onClick={principal.onClick}
                loading={principal.cargando}
                disabled={principal.deshabilitado}
              >
                {principal.texto}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            )}
            {ruta && queSigue && <p className="hidden text-sm text-text-soft md:block">{queSigue}</p>}
          </div>
        </footer>
      </div>
    </div>
  );
}
