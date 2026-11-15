"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { BFF_TWILIO, mensajeErrorTwilio } from "@/lib/conexion-twilio";
import { useAction } from "@/lib/use-action";

/**
 * Mensaje de prueba por Twilio (HU-CONN-13): un texto fijo al número que escribas. WhatsApp solo deja mandar
 * texto si ese número le escribió al negocio en las últimas 24 h; el backend permite una prueba cada 30 s y 10
 * al día.
 */
export function PruebaTwilio({ connectionId }: { connectionId: string }) {
  const { run, pending } = useAction({ refresh: false });
  const [toError, setToError] = useState<string>();

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
      const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      return {
        ok: res.ok,
        status: res.status,
        error: mensajeErrorTwilio(json.code, json.error ?? "No se pudo enviar la prueba."),
        success: "Enviamos la prueba. Revisa el WhatsApp de ese número.",
      };
    });
  }

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
    </form>
  );
}
