"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { parsePin } from "@/lib/meta-pin";
import { useAction } from "@/lib/use-action";

/**
 * Registro de un número en la Cloud API con su PIN de verificación en dos pasos, en línea
 * (wizard BYOK y "Pasar a producción", HU-CONN-06). Usa la misma ruta que "Números"; si la
 * conexión solo esperaba este registro, el backend la deja conectada.
 */
export function RegistroPinForm({
  connectionId,
  phoneNumberId,
  requerido = false,
  onRegistered,
}: {
  connectionId: string;
  phoneNumberId: string;
  /** Número real de producción: el PIN es obligatorio (no se genera uno que nadie ve). */
  requerido?: boolean;
  onRegistered?: () => void;
}) {
  const { run, pending } = useAction();
  const [pinError, setPinError] = useState<string>();
  const id = `pin-${phoneNumberId}`;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parsePin(String(new FormData(event.currentTarget).get("pin") ?? ""));
    if ("error" in parsed) {
      setPinError(parsed.error);
      return;
    }
    if (requerido && parsed.pin === null) {
      setPinError("Escribe el PIN de 6 dígitos del número.");
      return;
    }
    setPinError(undefined);
    const ok = await run(async () => {
      const res = await fetch(
        `/api/meta/connections/${connectionId}/numbers/${encodeURIComponent(phoneNumberId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "register", pin: parsed.pin }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        ok: res.ok,
        error: json.error ?? "No se pudo registrar el número.",
        success: "Número registrado.",
      };
    });
    if (ok) onRegistered?.();
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-3">
      <Field
        label="PIN de verificación en dos pasos"
        htmlFor={id}
        help={
          requerido
            ? "Si el número ya tiene verificación en dos pasos, escribe ese PIN. Si no, el que escribas queda como su PIN: guárdalo."
            : "Si el número ya tiene verificación en dos pasos, escribe ese PIN. Si no, el que escribas queda como su PIN; vacío, se genera uno y se guarda cifrado."
        }
        error={pinError}
        className="sm:max-w-xs"
      >
        <Input
          id={id}
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          aria-invalid={pinError ? true : undefined}
        />
      </Field>
      <div>
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? "Registrando…" : "Registrar número"}
        </Button>
      </div>
    </form>
  );
}
