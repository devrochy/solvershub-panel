"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";

import type { ChatDePrueba } from "@/lib/use-chat-de-prueba";
import { textoDelTurno } from "@/lib/use-chat-de-prueba";
import { cn } from "@/lib/utils";
import type { MensajeDeVistaPrevia } from "@/lib/vista-previa";

import { Burbujas, Cabecera } from "./vista-previa-whatsapp";

/** Junto a la última prueba: lo que la prueba no hace. */
export const SIN_ENVIAR_NADA = "No se envía nada a tus clientes y los pedidos son simulados.";

/** Los turnos del playground como burbujas del celular: lo simulado y lo escalado van como etapa. */
export function mensajesDeLaPrueba(turnos: ChatDePrueba["turnos"]): MensajeDeVistaPrevia[] {
  return turnos.flatMap((t): MensajeDeVistaPrevia[] => {
    const texto = textoDelTurno(t);
    if (t.role === "user") return [{ tipo: "cliente", texto }];
    if (texto.startsWith("⚠️")) return [{ tipo: "etapa", texto: "Pasó a una persona del equipo" }];
    return [{ tipo: "agente", texto }, ...(t.simulado ? [{ tipo: "etapa" as const, texto: "Acción simulada: no se creó nada real" }] : [])];
  });
}

/**
 * La prueba real de la estación 5 dentro de `CelularDeVistaPrevia` (HU-UX-31, D-SPEC-52-7): la conversación de
 * `useChatDePrueba` (el borrador en Nuevo agente, la conexión de pruebas en la bienvenida), las frases para tocar
 * y una caja que escribe de verdad, con Enter o con el botón de enviar. La caja va al fondo, como la simulada, para
 * que el aviso del celular quede justo encima. «Reiniciar conversación» y lo que la prueba no hace van en la
 * pregunta, fuera del celular (tablero `E5S`). No tiene estado propio de la conversación: el celular se pinta en la
 * columna y en el panel lateral, y las dos copias muestran lo mismo.
 *
 * `onEscribir` avisa la primera tecla o el toque de una frase (el editor cierra el aviso «Escribe aquí…»).
 */
export function ChatDelCelular({
  chat,
  agente,
  negocio,
  sugerencias,
  onEscribir,
  className,
}: {
  chat: ChatDePrueba;
  agente: string;
  negocio: string;
  sugerencias: readonly string[];
  onEscribir?: () => void;
  className?: string;
}) {
  const [texto, setTexto] = useState("");
  const caja = useRef<HTMLDivElement>(null);
  const mensajes = mensajesDeLaPrueba(chat.turnos);
  const ocupado = chat.cargando;

  // Baja solo la caja de mensajes, no la página.
  useEffect(() => {
    if (caja.current) caja.current.scrollTop = caja.current.scrollHeight;
  }, [mensajes.length]);

  function mandar(frase: string) {
    if (ocupado || !frase.trim()) return;
    onEscribir?.();
    setTexto("");
    void chat.enviar(frase);
  }

  return (
    <section aria-label={`Prueba con ${agente}`} className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] bg-bg-deep">
        <Cabecera negocio={negocio} agente={agente} subtitulo={`${agente} · prueba`} escribiendo={ocupado} />
        <div ref={caja} className="min-h-0 flex-1 overflow-y-auto">
          {mensajes.length > 0 ? (
            <Burbujas mensajes={mensajes} className="min-h-full p-4" />
          ) : (
            <p className="flex min-h-full items-end p-4 text-[0.8rem] text-text-soft">
              Escríbele como lo haría un cliente. Te responde aquí mismo.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5 border-t border-border-soft px-3 py-2.5">
          {sugerencias.length > 0 && (
            <>
              <p className="text-xs text-text-soft">¿Sin ideas? Toca una y se envía:</p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Frases para probar">
                {sugerencias.map((frase) => (
                  <button
                    key={frase}
                    type="button"
                    onClick={() => mandar(frase)}
                    disabled={ocupado}
                    className="min-h-8 rounded-full border border-control-border px-2.5 text-left text-xs text-headline transition-colors duration-150 hover:border-focus/50 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
                  >
                    {frase}
                  </button>
                ))}
              </div>
            </>
          )}
          {chat.error && (
            <p role="alert" className="text-xs text-status-danger-fg">
              {chat.error}
            </p>
          )}
          <form
            className="mt-1 flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              mandar(texto);
            }}
          >
            <input
              aria-label={`Mensaje para ${agente}`}
              value={texto}
              onChange={(e) => {
                if (!texto && e.target.value) onEscribir?.();
                setTexto(e.target.value);
              }}
              placeholder="Escribe como un cliente…"
              autoComplete="off"
              className="h-9 min-w-0 flex-1 rounded-full border border-control-border bg-surface px-3.5 text-xs text-headline placeholder:text-text-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
            />
            <button
              type="submit"
              disabled={ocupado || !texto.trim()}
              aria-label="Enviar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-action text-white disabled:opacity-50"
            >
              <SendHorizontal className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
