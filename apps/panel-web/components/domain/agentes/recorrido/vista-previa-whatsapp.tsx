"use client";

import { useState } from "react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ultimosMensajes, type MensajeDeVistaPrevia } from "@/lib/vista-previa";

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

function Cabecera({ negocio, agente, subtitulo }: { negocio: string; agente: string; subtitulo?: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-surface px-4 py-3">
      <Inicial nombre={agente} className="h-9 w-9 text-sm" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-headline">{negocio || "Tu negocio"}</p>
        <p className="truncate text-xs text-text-soft">{subtitulo ?? `${agente || "Tu agente"} · agente`}</p>
      </div>
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
