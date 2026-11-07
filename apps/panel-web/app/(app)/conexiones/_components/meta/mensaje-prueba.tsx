"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { components } from "@/lib/api/schema";
import { useAction } from "@/lib/use-action";

type Opciones = components["schemas"]["TestMessageOptions"];

/**
 * "Enviar mensaje de prueba" (HU-SH-05): manda una plantilla aprobada sin variables al número
 * que escribas. Fuera de la ventana de 24 h Meta solo deja escribir con plantilla; el envío lo
 * cobra Meta al negocio como cualquier plantilla.
 */
export function MensajePrueba({ connectionId, opciones }: { connectionId: string; opciones: Opciones }) {
  const { run, pending } = useAction({ refresh: false });
  const [toError, setToError] = useState<string>();

  if (!opciones.can_send) {
    return <p className="text-sm text-body">{opciones.blocked_reason ?? "Esta conexión todavía no puede enviar."}</p>;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const to = String(data.get("to") ?? "").trim();
    const digitos = to.replace(/[\s+\-().]/g, "");
    if (!/^[0-9]{8,15}$/.test(digitos)) {
      setToError("Escribe el número con el indicativo del país, por ejemplo +57 300 123 4567.");
      return;
    }
    setToError(undefined);
    const [templateName, language] = String(data.get("template") ?? "").split("|");
    await run(async () => {
      const res = await fetch(`/api/meta/connections/${connectionId}/test-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, template_name: templateName, language }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; template?: { name: string } };
      return {
        ok: res.ok,
        error: json.error ?? "No se pudo enviar la prueba.",
        success: `Enviamos «${json.template?.name ?? templateName}». Revisa el WhatsApp de ese número.`,
      };
    });
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => void onSubmit(e)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Enviar a" htmlFor="prueba_to" error={toError} help="Un WhatsApp tuyo, con indicativo del país.">
          <Input
            id="prueba_to"
            name="to"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="+57 300 123 4567"
            aria-invalid={toError ? true : undefined}
          />
        </Field>
        <Field label="Plantilla" htmlFor="prueba_template" help="Aprobadas y sin variables.">
          <Select id="prueba_template" name="template" defaultValue={`${opciones.templates[0]?.name}|${opciones.templates[0]?.language}`}>
            {opciones.templates.map((t) => (
              <option key={`${t.name}|${t.language}`} value={`${t.name}|${t.language}`}>
                {t.name} ({t.language})
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div>
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? "Enviando…" : "Enviar mensaje de prueba"}
        </Button>
      </div>
    </form>
  );
}
