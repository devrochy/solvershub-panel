"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  BFF_TWILIO,
  mensajeErrorTwilio,
  resultadoDePrueba,
  type ResultadoPruebaTwilio,
} from "@/lib/conexion-twilio";
import { useAction } from "@/lib/use-action";

/** Cada cuánto y hasta cuándo se consulta el resultado: el 63015 del Sandbox llega en ~1 s, una entrega en pocos. */
const CONSULTA_CADA_MS = 2000;
const CONSULTA_HASTA_MS = 20000;

/**
 * Mensaje de prueba por Twilio (HU-CONN-13): un texto fijo al número que escribas. WhatsApp solo deja mandar
 * texto si ese número le escribió al negocio en las últimas 24 h; el backend permite una prueba cada 30 s y 10
 * al día. Twilio acepta el envío y el rechazo llega después por el status callback, así que tras enviar se
 * consulta el resultado unos segundos y se muestra «Entregado», «Leído» o «No llegó» con el motivo.
 */
export function PruebaTwilio({ connectionId }: { connectionId: string }) {
  const { run, pending } = useAction({ refresh: false });
  const [toError, setToError] = useState<string>();
  const [sid, setSid] = useState<string>();
  const [resultado, setResultado] = useState<ResultadoPruebaTwilio | null>(null);
  const [vencido, setVencido] = useState(false);

  useEffect(() => {
    if (!sid) return;
    // Una prueba nueva o salir de la página cancela la consulta anterior (limpieza del efecto).
    const control = new AbortController();
    const inicio = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function consultar() {
      let ultimo: ResultadoPruebaTwilio | null = null;
      try {
        const res = await fetch(
          `${BFF_TWILIO}/${encodeURIComponent(connectionId)}/test-message/${encodeURIComponent(sid!)}`,
          { signal: control.signal, cache: "no-store" },
        );
        if (res.ok) {
          ultimo = (await res.json()) as ResultadoPruebaTwilio;
          setResultado(ultimo);
        }
      } catch {
        if (control.signal.aborted) return;
      }
      if (control.signal.aborted) return;
      const terminado = Date.now() - inicio >= CONSULTA_HASTA_MS;
      if (resultadoDePrueba(ultimo, false).final) return;
      if (terminado) {
        setVencido(true);
        return;
      }
      timer = setTimeout(() => void consultar(), CONSULTA_CADA_MS);
    }

    timer = setTimeout(() => void consultar(), CONSULTA_CADA_MS);
    return () => {
      control.abort();
      if (timer) clearTimeout(timer);
    };
  }, [sid, connectionId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const to = String(new FormData(event.currentTarget).get("to") ?? "").trim();
    const digitos = to.replace(/[\s+\-().]/g, "");
    if (!/^[0-9]{8,15}$/.test(digitos)) {
      setToError("Escribe el número con el indicativo del país, por ejemplo +57 300 123 4567.");
      return;
    }
    setToError(undefined);
    await run(async () => {
      const res = await fetch(`${BFF_TWILIO}/${encodeURIComponent(connectionId)}/test-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: `+${digitos}` }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string; message_sid?: string };
      if (res.ok && json.message_sid) {
        setResultado(null);
        setVencido(false);
        setSid(json.message_sid);
      }
      return {
        ok: res.ok,
        status: res.status,
        error: mensajeErrorTwilio(json.code, json.error ?? "No se pudo enviar la prueba."),
        success: "Twilio aceptó la prueba. Abajo verás si llegó.",
      };
    });
  }

  const estado = sid ? resultadoDePrueba(resultado, vencido) : null;

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => void onSubmit(e)}>
      <Field
        label="Enviar a"
        htmlFor="twilio_prueba_to"
        error={toError}
        help="Un WhatsApp tuyo, con indicativo del país, que le haya escrito a este número en las últimas 24 h."
      >
        <Input
          id="twilio_prueba_to"
          name="to"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="+57 300 123 4567"
          className="sm:max-w-xs"
        />
      </Field>
      <div>
        <Button type="submit" variant="accent" loading={pending}>
          Enviar mensaje de prueba
        </Button>
      </div>
      {estado ? (
        <div role="status" aria-live="polite" className="flex flex-col items-start gap-1.5">
          <Badge variant={estado.tono}>{estado.label}</Badge>
          <p className="text-sm text-muted-foreground">{estado.detalle}</p>
        </div>
      ) : null}
    </form>
  );
}
