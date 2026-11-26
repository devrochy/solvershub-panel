"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from "react";

import { Button } from "@/components/ui/button";
import { FaviconDeLaMarca } from "@/components/ui/glifos-de-marca";
import { cn } from "@/lib/utils";

export type EstadoDeLaPregunta = "abierta" | "respondida" | "pendiente";

/**
 * Una pregunta del recorrido de una pregunta a la vez (HU-UX-26, D-SPEC-52-1, tablero `E1-E`). Tres estados:
 * - **abierta**: tarjeta con borde cian, «Pregunta n de m», título de 24 px, ayuda, el contenido y «Continuar»
 *   («Listo» en la última);
 * - **respondida**: una línea con el favicon de SolversHub, la pregunta en pequeño, la respuesta y «Cambiar»;
 * - **pendiente**: su número en un círculo y el título en gris.
 *
 * Es una `section` con `aria-labelledby` a su título. El título es enfocable (`tabIndex={-1}`) para que
 * `ListaDePreguntas` le pase el foco al continuar o al cambiar. No guarda la respuesta: la pasa la estación.
 */
export function PreguntaDelRecorrido({
  estado,
  numero,
  total,
  titulo,
  ayuda,
  respuesta,
  textoContinuar = "Continuar",
  puedeContinuar = true,
  onContinuar,
  onCambiar,
  nivel = "h2",
  tituloRef,
  children,
  className,
}: {
  estado: EstadoDeLaPregunta;
  numero: number;
  total: number;
  titulo: string;
  ayuda?: ReactNode;
  /** El resumen de lo elegido, para la línea de la respondida. */
  respuesta?: ReactNode;
  textoContinuar?: string;
  /** Falso cuando falta algo para seguir (por ejemplo, un nombre vacío). */
  puedeContinuar?: boolean;
  onContinuar?: () => void;
  onCambiar?: () => void;
  /** `h3` cuando la página ya usa `h2` para la estación (dentro del shell). */
  nivel?: "h2" | "h3";
  tituloRef?: Ref<HTMLHeadingElement>;
  children?: ReactNode;
  className?: string;
}) {
  const idTitulo = useId();
  const Titulo = nivel;

  if (estado === "respondida") {
    return (
      <section
        aria-labelledby={idTitulo}
        className={cn("flex items-center gap-3.5 rounded-lg border border-focus/25 px-4 py-3", className)}
      >
        <FaviconDeLaMarca className="h-8 w-8 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Titulo ref={tituloRef} id={idTitulo} tabIndex={-1} className="text-sm font-medium text-text-soft outline-none">
            {titulo}
            <span className="sr-only">, respondida</span>
          </Titulo>
          {respuesta !== undefined && <p className="min-w-0 truncate text-base font-semibold text-headline">{respuesta}</p>}
        </div>
        {onCambiar && (
          <Button variant="ghost" size="sm" onClick={onCambiar} aria-label={`Cambiar: ${titulo}`}>
            Cambiar
          </Button>
        )}
      </section>
    );
  }

  if (estado === "pendiente") {
    return (
      <section aria-labelledby={idTitulo} className={cn("flex items-center gap-3.5 rounded-lg border border-border-soft px-4 py-3.5", className)}>
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-control-border text-[0.8125rem] font-semibold text-text-soft"
        >
          {numero}
        </span>
        <Titulo ref={tituloRef} id={idTitulo} tabIndex={-1} className="text-base font-medium text-text-soft outline-none">
          {titulo}
          <span className="sr-only">, pregunta {numero} de {total}, pendiente</span>
        </Titulo>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={idTitulo}
      className={cn("flex flex-col gap-5 rounded-lg border border-focus/40 bg-surface p-5 sm:p-6", className)}
    >
      <div className="flex flex-col gap-1.5">
        <p className="text-[0.8125rem] font-medium text-link">
          Pregunta {numero} de {total}
        </p>
        <Titulo
          ref={tituloRef}
          id={idTitulo}
          tabIndex={-1}
          className="font-display text-sh-h1 text-headline outline-none focus-visible:underline focus-visible:decoration-focus focus-visible:underline-offset-4"
        >
          {titulo}
        </Titulo>
        {ayuda && <div className="text-[0.9375rem] leading-6 text-body">{ayuda}</div>}
      </div>
      {children}
      {onContinuar && (
        <div className="flex justify-end">
          <Button onClick={onContinuar} disabled={!puedeContinuar}>
            {textoContinuar}
          </Button>
        </div>
      )}
    </section>
  );
}

/** Una pregunta para `ListaDePreguntas`: la estación decide su contenido, su resumen y si se puede seguir. */
export type PreguntaDeLaLista = {
  id: string;
  titulo: string;
  ayuda?: ReactNode;
  respuesta?: ReactNode;
  puedeContinuar?: boolean;
  contenido: ReactNode;
};

/** «Faltan 2 preguntas», «Falta 1 pregunta» o «Listo»: el estado del pie de la estación. */
export function textoDeFaltan(faltan: number): string {
  if (faltan <= 0) return "Listo";
  return faltan === 1 ? "Falta 1 pregunta" : `Faltan ${faltan} preguntas`;
}

/**
 * Las preguntas de una estación, una a la vez (HU-UX-26). Solo lleva cuál está abierta: las anteriores quedan
 * respondidas y las siguientes pendientes. «Continuar» abre la siguiente («Listo» cierra la última y avisa con
 * `onTerminar`); «Cambiar» reabre una respondida y las demás conservan lo que tenían, porque las respuestas
 * las guarda la estación, no la lista. Al continuar o cambiar, el foco pasa al título de la que queda abierta
 * (o al de la última respondida si ya no queda ninguna); al montar no se roba el foco.
 *
 * Puede ir sola (`abiertaInicial`) o controlada (`abierta` + `onAbrir`), por ejemplo para que el pie diga
 * cuántas faltan con `textoDeFaltan(preguntas.length - abierta)`.
 */
export function ListaDePreguntas({
  preguntas,
  abierta: abiertaControlada,
  onAbrir,
  abiertaInicial = 0,
  onTerminar,
  textoDeLaUltima = "Listo",
  nivel = "h2",
  className,
}: {
  preguntas: readonly PreguntaDeLaLista[];
  /** El índice de la abierta; `preguntas.length` = todas respondidas. */
  abierta?: number;
  onAbrir?: (indice: number) => void;
  abiertaInicial?: number;
  onTerminar?: () => void;
  textoDeLaUltima?: string;
  nivel?: "h2" | "h3";
  className?: string;
}) {
  const [abiertaPropia, setAbiertaPropia] = useState(abiertaInicial);
  const abierta = Math.min(abiertaControlada ?? abiertaPropia, preguntas.length);
  const titulos = useRef<(HTMLHeadingElement | null)[]>([]);
  const enfocar = useRef<number | null>(null);

  useEffect(() => {
    // Solo después de una acción del dueño: el montaje no mueve el foco.
    if (enfocar.current === null) return;
    titulos.current[enfocar.current]?.focus();
    enfocar.current = null;
  }, [abierta]);

  function abrir(indice: number) {
    enfocar.current = Math.min(indice, preguntas.length - 1);
    if (abiertaControlada === undefined) setAbiertaPropia(indice);
    onAbrir?.(indice);
    if (indice >= preguntas.length) onTerminar?.();
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {preguntas.map((p, i) => {
        const estado: EstadoDeLaPregunta = i < abierta ? "respondida" : i === abierta ? "abierta" : "pendiente";
        const ultima = i === preguntas.length - 1;
        return (
          <PreguntaDelRecorrido
            key={p.id}
            estado={estado}
            numero={i + 1}
            total={preguntas.length}
            titulo={p.titulo}
            ayuda={p.ayuda}
            respuesta={p.respuesta}
            puedeContinuar={p.puedeContinuar}
            textoContinuar={ultima ? textoDeLaUltima : "Continuar"}
            onContinuar={() => abrir(i + 1)}
            onCambiar={() => abrir(i)}
            nivel={nivel}
            tituloRef={(el) => {
              titulos.current[i] = el;
            }}
          >
            {estado === "abierta" ? p.contenido : null}
          </PreguntaDelRecorrido>
        );
      })}
    </div>
  );
}
