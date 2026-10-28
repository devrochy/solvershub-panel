"use client";

import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Textarea } from "@/components/ui/textarea";
import type { PlaygroundMensaje } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import {
  avisoDeToque,
  leerInteractivo,
  mensajeDeErrorPlayground,
  type AvisoDeToque,
  type InteractivoLeido,
} from "@/lib/playground-opciones";
import { playgroundOpcionesApi } from "@/lib/playground-opciones-cliente";

import { MensajeConBotones } from "./mensaje-con-botones";
import { ProbarPlantilla } from "./probar-plantilla";

type Turno = { role?: string; text?: string; content?: string; interactivo?: InteractivoLeido };

function texto(t: Turno): string {
  return t.text ?? t.content ?? JSON.stringify(t);
}

/** Mensajes de `/options` y `/tap` → turnos del chat (los que traen botones se pintan tocables). */
function turnosDe(mensajes: PlaygroundMensaje[]): Turno[] {
  return mensajes.map((m) => {
    const interactivo = leerInteractivo(m.interactive);
    return { role: "assistant", text: m.content, ...(interactivo ? { interactivo } : {}) };
  });
}

const TONO_AVISO: Record<AvisoDeToque["tono"], string> = {
  info: "border-status-info-border bg-status-info-bg text-status-info-fg",
  warning: "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
  danger: "border-status-danger-border bg-status-danger-bg text-status-danger-fg",
};

/**
 * Chat de prueba del asistente: mismo loop del runtime, sin canales.
 *
 * Con `conexionId` la prueba corre por esa conexión (HU-AOS-57): así se prueba la versión activa del
 * agente publicado ahí, como en el asistente de primer uso. `sugerencias` son frases para empezar con un
 * toque y `alRecibirRespuesta` avisa cuando el agente contestó.
 *
 * Con `probarOpciones` suma «Probar plantilla con opciones» (SPEC-40, pista B2): envía una plantilla publicada a la
 * conversación de prueba, pinta sus botones y, al tocarlos, simula el toque con el mismo resolver de WhatsApp. Los
 * botones viven en este navegador: el historial del servidor solo trae la charla con el asistente.
 */
export function ChatPrueba({
  conexionId,
  sugerencias,
  alRecibirRespuesta,
  probarOpciones,
}: {
  conexionId?: string;
  sugerencias?: string[];
  alRecibirRespuesta?: () => void;
  /** Muestra el selector de plantillas con opciones; `plantillaInicial` es la clave que viene del editor. */
  probarOpciones?: { plantillaInicial?: string };
} = {}) {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [texto_, setTexto] = useState("");
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});
  const [aviso, setAviso] = useState<AvisoDeToque | null>(null);
  const [tocados, setTocados] = useState<ReadonlySet<string>>(new Set());
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let activo = true;
    void (async () => {
      const res = await fetch(`/api/playground${conexionId ? `?connection_id=${conexionId}` : ""}`);
      const json = (await res.json().catch(() => ({}))) as { turns?: Turno[] };
      if (activo) setTurnos(json.turns ?? []);
    })();
    return () => {
      activo = false;
    };
  }, [conexionId]);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth" });
  }, [turnos]);

  async function enviar(frase?: string) {
    const limpio = (frase ?? texto_).trim();
    if (!limpio) return;
    setStatus({ loading: true });
    setTurnos((previos) => [...previos, { role: "user", text: limpio }]);
    setTexto("");
    const res = await fetch("/api/playground", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "message", text: limpio, ...(conexionId ? { connection_id: conexionId } : {}) }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      text?: string;
      image_url?: string | null;
      escalated?: boolean;
      error?: string;
    };
    setStatus({ loading: false });
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo procesar el mensaje." });
      return;
    }
    setTurnos((previos) => [
      ...previos,
      { role: "assistant", text: json.text ?? "(sin respuesta)" },
      ...(json.escalated ? [{ role: "assistant", text: "⚠️ Escalado a un humano" }] : []),
    ]);
    if (!json.escalated) alRecibirRespuesta?.();
  }

  async function enviarPlantilla(clave: string, nombre: string) {
    setStatus({ loading: true });
    setAviso(null);
    const res = await playgroundOpcionesApi.enviar(clave, conexionId);
    setStatus({ loading: false });
    if (!res.ok) {
      setAviso({ tono: "danger", texto: mensajeDeErrorPlayground(res) });
      return;
    }
    setTurnos((previos) => [...previos, ...turnosDe(res.data.mensajes)]);
    if (res.data.ya_enviado) setAviso({ tono: "info", texto: "Esa plantilla ya estaba en el chat." });
    else if (res.data.via === "texto") {
      setAviso({
        tono: "warning",
        texto: `«${nombre}» salió como texto con las opciones numeradas, sin botones: no cabe en un mensaje interactivo. Revisa los topes en el editor.`,
      });
    }
  }

  async function tocar(id: string, titulo: string) {
    setStatus({ loading: true });
    setAviso(null);
    setTocados((previos) => new Set(previos).add(id));
    setTurnos((previos) => [...previos, { role: "user", text: titulo }]);
    const res = await playgroundOpcionesApi.tocar(id, conexionId);
    setStatus({ loading: false });
    if (!res.ok) {
      // El toque no llegó a ejecutarse: el botón vuelve a poder tocarse y lo que "dijo" el cliente se retira.
      setTurnos((previos) => previos.slice(0, -1));
      setTocados((previos) => {
        const siguientes = new Set(previos);
        siguientes.delete(id);
        return siguientes;
      });
      setAviso({ tono: "danger", texto: mensajeDeErrorPlayground(res) });
      return;
    }
    setTurnos((previos) => [...previos, ...turnosDe(res.data.mensajes)]);
    setAviso(avisoDeToque(res.data.outcome, res.data.mensajes.length));
  }

  async function reiniciar() {
    setStatus({ loading: true });
    const res = await fetch("/api/playground", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset", ...(conexionId ? { connection_id: conexionId } : {}) }),
    });
    setStatus({ loading: false });
    if (!res.ok) {
      setStatus({ error: "No se pudo reiniciar la prueba." });
      return;
    }
    setTurnos([]);
    setAviso(null);
    setTocados(new Set());
  }

  return (
    <div className="flex flex-col gap-4">
      {probarOpciones && (
        <ProbarPlantilla inicial={probarOpciones.plantillaInicial} ocupado={!!status.loading} onEnviar={(c, n) => void enviarPlantilla(c, n)} />
      )}
      <Card>
        <CardContent className="flex max-h-[60vh] min-h-72 flex-col gap-3 overflow-y-auto pt-5">
          {turnos.length === 0 ? (
            <p className="text-sm text-text-soft">
              Escribe un mensaje para probar el asistente. Corre el mismo loop que atiende
              WhatsApp, pero sin enviar nada por ningún canal.
            </p>
          ) : (
            turnos.map((t, i) => (
              <div
                key={`${i}-${texto(t).slice(0, 12)}`}
                className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {t.interactivo ? (
                  <MensajeConBotones
                    interactivo={t.interactivo}
                    tocados={tocados}
                    ocupado={!!status.loading}
                    onTocar={(id, titulo) => void tocar(id, titulo)}
                  />
                ) : (
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      t.role === "user"
                        ? "bg-action text-white"
                        : "border border-border-soft bg-surface text-body"
                    }`}
                  >
                    {texto(t)}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={fin} />
        </CardContent>
      </Card>

      {aviso && (
        <p
          role={aviso.tono === "info" ? "status" : "alert"}
          className={cn("rounded-md border p-3 text-sm", TONO_AVISO[aviso.tono])}
        >
          {aviso.texto}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {sugerencias && sugerencias.length > 0 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Frases para probar">
            {sugerencias.map((frase) => (
              <button
                key={frase}
                type="button"
                disabled={status.loading}
                onClick={() => void enviar(frase)}
                className="min-h-11 rounded-full border border-control-border px-4 text-sm text-headline transition-colors hover:border-focus/60 hover:bg-focus/10 disabled:opacity-50"
              >
                {frase}
              </button>
            ))}
          </div>
        )}
        <Textarea
          aria-label="Mensaje de prueba"
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void enviar();
            }
          }}
          placeholder="Escribe como si fueras el cliente… (Enter envía, Shift+Enter salto de línea)"
          rows={3}
          value={texto_}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={status.loading} onClick={() => void enviar()} variant="accent">
            {status.loading ? "Procesando…" : "Enviar"}
          </Button>
          <Button disabled={status.loading} onClick={() => void reiniciar()} variant="outline">
            Reiniciar prueba
          </Button>
          <Badge variant="neutral">canal: test</Badge>
          <FormFeedback error={status.error} />
        </div>
      </div>
    </div>
  );
}
