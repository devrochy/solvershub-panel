"use client";

import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Textarea } from "@/components/ui/textarea";

type Turno = { role?: string; text?: string; content?: string };

function texto(t: Turno): string {
  return t.text ?? t.content ?? JSON.stringify(t);
}

/** Chat de prueba del asistente: mismo loop del runtime, sin canales. */
export function ChatPrueba() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [texto_, setTexto] = useState("");
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let activo = true;
    void (async () => {
      const res = await fetch("/api/playground");
      const json = (await res.json().catch(() => ({}))) as { turns?: Turno[] };
      if (activo) setTurnos(json.turns ?? []);
    })();
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth" });
  }, [turnos]);

  async function enviar() {
    const limpio = texto_.trim();
    if (!limpio) return;
    setStatus({ loading: true });
    setTurnos((previos) => [...previos, { role: "user", text: limpio }]);
    setTexto("");
    const res = await fetch("/api/playground", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "message", text: limpio }),
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
  }

  async function reiniciar() {
    setStatus({ loading: true });
    const res = await fetch("/api/playground", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    setStatus({ loading: false });
    if (!res.ok) {
      setStatus({ error: "No se pudo reiniciar la prueba." });
      return;
    }
    setTurnos([]);
  }

  return (
    <div className="flex flex-col gap-4">
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
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    t.role === "user"
                      ? "bg-action text-white"
                      : "border border-border-soft bg-surface text-body"
                  }`}
                >
                  {texto(t)}
                </div>
              </div>
            ))
          )}
          <div ref={fin} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
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
