"use client";

import { useEffect, useRef, useState } from "react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { TipoDeNegocio } from "@/lib/onboarding";
import type { EstacionDeLaRuta } from "@/lib/ruta-de-lanzamiento";
import { cn } from "@/lib/utils";
import {
  LEYENDA_DEL_CHAT,
  pruebasDeFrasesPropias,
  respuestaAFrasePropia,
  respuestaDePrueba,
  rotuloDePruebas,
  saludoDePrueba,
  sugerenciasPorEstacion,
  ultimosMensajes,
  type CargadoDeVistaPrevia,
  type FrasePropiaDePrueba,
  type MensajeDeVistaPrevia,
} from "@/lib/vista-previa";

export type SugerenciaDeVistaPrevia = { id: string; texto: string; activa: boolean; onUsar: () => void };

const AVISO = "Así respondería · vista previa, no envía mensajes";

/**
 * Teléfono con una conversación de WhatsApp de ejemplo (HU-UX-22). Muestra cómo respondería el
 * agente con lo decidido en el paso; los mensajes los arma `lib/vista-previa.ts` con textos fijos.
 * Las sugerencias son frases de cliente para probar (por ejemplo, la de un superpoder).
 */
export function VistaPreviaWhatsApp({
  negocio,
  agente,
  subtitulo,
  mensajes,
  sugerencias = [],
  className,
}: {
  negocio: string;
  agente: string;
  subtitulo?: string;
  mensajes: readonly MensajeDeVistaPrevia[];
  sugerencias?: readonly SugerenciaDeVistaPrevia[];
  className?: string;
}) {
  return (
    <section aria-label="Vista previa en WhatsApp" className={cn("flex min-h-0 flex-col gap-2", className)}>
      <p className="text-xs font-medium text-text-soft">{AVISO}</p>
      <div className="flex min-h-[28rem] flex-1 flex-col overflow-hidden rounded-[2rem] border-[6px] border-surface-2 bg-bg-deep">
        <Cabecera negocio={negocio} agente={agente} subtitulo={subtitulo} />
        <Burbujas mensajes={mensajes} className="flex-1 p-4" />
        {sugerencias.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t border-border-soft px-3 py-2.5" aria-label="Frases para probar" role="group">
            {sugerencias.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={s.onUsar}
                aria-pressed={s.activa}
                className={cn(
                  "min-h-8 rounded-full border px-2.5 text-xs text-headline transition-colors duration-150 motion-reduce:transition-none",
                  s.activa ? "border-focus bg-focus/15" : "border-control-border hover:border-focus/50",
                )}
              >
                «{s.texto}»
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * La vista previa en el móvil: una hoja sobre el pie con las dos últimas burbujas y «Ver teléfono»,
 * que abre el teléfono completo en un panel.
 */
export function HojaDeVistaPrevia(props: {
  negocio: string;
  agente: string;
  subtitulo?: string;
  mensajes: readonly MensajeDeVistaPrevia[];
  sugerencias?: readonly SugerenciaDeVistaPrevia[];
  className?: string;
}) {
  const [abierta, setAbierta] = useState(false);
  return (
    <div className={cn("flex flex-col gap-2 rounded-t-lg border-t border-border-strong bg-bg-deep px-4 pb-3 pt-2", props.className)}>
      <span aria-hidden className="mx-auto h-1 w-9 rounded-full bg-control-border" />
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-medium text-body">
          <Inicial nombre={props.agente} className="h-6 w-6 text-[0.65rem]" />
          Así respondería
        </span>
        <Sheet open={abierta} onOpenChange={setAbierta}>
          <SheetTrigger asChild>
            <button type="button" className="min-h-9 rounded-sm px-1 text-xs font-medium text-link">
              Ver teléfono
            </button>
          </SheetTrigger>
          <SheetContent title="Vista previa en WhatsApp" description={AVISO}>
            <VistaPreviaWhatsApp {...props} className="h-full" />
          </SheetContent>
        </Sheet>
      </div>
      <Burbujas mensajes={ultimosMensajes(props.mensajes)} />
    </div>
  );
}

function Cabecera({
  negocio,
  agente,
  subtitulo,
  escribiendo = false,
}: {
  negocio: string;
  agente: string;
  subtitulo?: string;
  escribiendo?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 bg-surface px-4 py-3">
      <Inicial nombre={agente} className="h-9 w-9 text-sm" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-headline">{negocio || "Tu negocio"}</p>
        <p className={cn("truncate text-xs", escribiendo ? "font-medium text-link" : "text-text-soft")}>
          {escribiendo ? "escribiendo…" : (subtitulo ?? `${agente || "Tu agente"} · agente`)}
        </p>
      </div>
    </div>
  );
}

/**
 * Chat de vista previa de la ruta de lanzamiento (HU-UX-24, D-SPEC-49-4): simulado, sin modelo ni red.
 * Ofrece los mensajes de prueba de la estación y el tipo («Pruebas de «Datos del cliente» · toca una»);
 * al tocar uno, el cliente lo «escribe», el agente pasa a «escribiendo…» y llega la respuesta fija de
 * `lib/vista-previa.ts`. Al cambiar de estación o de tipo, la conversación vuelve a empezar.
 *
 * `enCelular` es la pantalla de `CelularDeVistaPrevia` (HU-UX-26): sin marco ni leyenda propios (los pone el
 * celular), a todo el alto y con la caja «Escribe como un cliente…» abajo. En las estaciones 1 a 4 la caja no
 * escribe (el chat es simulado, D-SPEC-52-7): solo se prueba con las frases.
 */
export function ChatDeVistaPrevia(props: {
  tipo: TipoDeNegocio;
  estacion: EstacionDeLaRuta;
  agente: string;
  negocio: string;
  /** Lo cargado en «Datos para probar»; solo se usa desde la estación 4. */
  cargados?: readonly CargadoDeVistaPrevia[];
  /** Cuánto tarda en «escribir» la respuesta, en ms. */
  demora?: number;
  enCelular?: boolean;
  /** Al tocar una frase de prueba (el celular cierra su aviso). */
  onProbar?: () => void;
  /** Frases propias del dueño (estación 2, HU-UX-28): van primero entre las pruebas. */
  frasesPropias?: readonly FrasePropiaDePrueba[];
  className?: string;
}) {
  return <Conversacion key={`${props.tipo}:${props.estacion}`} {...props} />;
}

function Conversacion({
  tipo,
  estacion,
  agente,
  negocio,
  cargados = [],
  demora = 900,
  enCelular = false,
  onProbar,
  frasesPropias = [],
  className,
}: {
  tipo: TipoDeNegocio;
  estacion: EstacionDeLaRuta;
  agente: string;
  negocio: string;
  cargados?: readonly CargadoDeVistaPrevia[];
  demora?: number;
  enCelular?: boolean;
  onProbar?: () => void;
  frasesPropias?: readonly FrasePropiaDePrueba[];
  className?: string;
}) {
  const [mensajes, setMensajes] = useState<MensajeDeVistaPrevia[]>(() => [saludoDePrueba(tipo, agente, negocio)]);
  const [escribiendo, setEscribiendo] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );
  const delGuion = sugerenciasPorEstacion(tipo, estacion, cargados);
  const propias = pruebasDeFrasesPropias(frasesPropias, delGuion);
  const sugerencias = [...propias, ...delGuion];

  function probar(id: string, texto: string) {
    if (escribiendo) return;
    onProbar?.();
    const propia = propias.find((p) => p.id === id);
    setMensajes((m) => [...m, { tipo: "cliente", texto }]);
    setEscribiendo(true);
    temporizador.current = setTimeout(() => {
      const respuesta = propia
        ? respuestaAFrasePropia(propia.superpoder)
        : respuestaDePrueba(tipo, estacion, id, { agente, negocio, cargados });
      setMensajes((m) => [...m, ...respuesta]);
      setEscribiendo(false);
    }, demora);
  }

  return (
    <section aria-label="Vista previa en WhatsApp" className={cn("flex min-h-0 flex-col gap-2", className)}>
      <div
        className={cn(
          "flex flex-1 flex-col overflow-hidden bg-bg-deep",
          enCelular ? "min-h-0 rounded-[1.75rem]" : "min-h-[28rem] rounded-[2rem] border-[6px] border-surface-2",
        )}
      >
        <Cabecera negocio={negocio} agente={agente} escribiendo={escribiendo} />
        <Burbujas mensajes={mensajes} className="min-h-0 flex-1 overflow-y-auto p-4" />
        <div className="flex flex-col gap-1.5 border-t border-border-soft px-3 py-2.5">
          <p className="text-xs text-text-soft">{rotuloDePruebas(estacion)}</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={rotuloDePruebas(estacion)}>
            {sugerencias.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => probar(s.id, s.texto)}
                disabled={escribiendo}
                className="min-h-8 rounded-full border border-control-border px-2.5 text-left text-xs text-headline transition-colors duration-150 hover:border-focus/50 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
              >
                {s.texto}
              </button>
            ))}
          </div>
          {enCelular && <CajaSinEscribir />}
        </div>
      </div>
      {!enCelular && <p className="text-center text-xs text-text-soft">{LEYENDA_DEL_CHAT}</p>}
    </section>
  );
}

/**
 * La caja de texto del celular mientras el chat es simulado: se ve como la de WhatsApp, pero no escribe
 * (es puro adorno, `aria-hidden`). La caja que escribe llega con la prueba real de la estación 5 (HU-UX-31).
 */
export function CajaSinEscribir() {
  return (
    <div
      aria-hidden
      className="mt-1 flex h-9 items-center rounded-full border border-border-soft bg-bg-deep px-3.5 text-xs text-text-soft"
    >
      Escribe como un cliente…
    </div>
  );
}

function Inicial({ nombre, className }: { nombre: string; className?: string }) {
  const letra = nombre.trim().charAt(0).toLocaleUpperCase("es-CO");
  return (
    <span
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center rounded-full bg-cta font-display font-bold text-white", className)}
    >
      {letra || "·"}
    </span>
  );
}

function Burbujas({ mensajes, className }: { mensajes: readonly MensajeDeVistaPrevia[]; className?: string }) {
  return (
    <ol aria-live="polite" className={cn("flex flex-col justify-end gap-2", className)}>
      {mensajes.map((m, i) => {
        if (m.tipo === "etapa") {
          return (
            <li key={i} className="self-center rounded-full bg-status-info-bg px-2.5 py-0.5 text-[0.7rem] text-status-info-fg">
              {m.texto}
            </li>
          );
        }
        if (m.tipo === "tarjeta") {
          return (
            <li key={i} className="flex justify-start">
              <div className="w-[85%] rounded-2xl rounded-bl-sm border border-border-soft bg-surface-2 px-3 py-2 text-[0.8rem] text-headline">
                <p className="font-semibold">
                  <span className="sr-only">Agente: </span>
                  {m.texto}
                </p>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {m.filas.map((f, j) => (
                    <li key={j} className="flex justify-between gap-3">
                      <span className="min-w-0">{f.nombre}</span>
                      {f.detalle && <span className="shrink-0 text-body">{f.detalle}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        }
        const cliente = m.tipo === "cliente";
        return (
          <li key={i} className={cn("flex", cliente ? "justify-end" : "justify-start")}>
            <p
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-[0.8rem] leading-snug",
                cliente
                  ? "rounded-br-sm bg-action text-white"
                  : "rounded-bl-sm border border-border-soft bg-surface-2 text-headline",
              )}
            >
              <span className="sr-only">{cliente ? "Cliente: " : "Agente: "}</span>
              {m.texto}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
