"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { InputPassword } from "@/components/ui/input-password";
import { parsePin } from "@/lib/meta-pin";
import { useAction } from "@/lib/use-action";

/** Registro de un número en la Cloud API con el PIN de verificación en dos pasos. */
export function RegisterNumberDialog({
  connectionId,
  phoneNumberId,
  label,
}: {
  connectionId: string;
  phoneNumberId: string;
  label: string;
}) {
  const { run, pending } = useAction();
  const [open, setOpen] = useState(false);
  const [pinError, setPinError] = useState<string>();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setPinError(undefined);
  }

  async function register(pin: string | null) {
    const res = await fetch(
      `/api/meta/connections/${connectionId}/numbers/${encodeURIComponent(phoneNumberId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", pin }),
      },
    );
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    return {
      ok: res.ok,
      error: json.error ?? "No se pudo registrar el número.",
      success: "Número registrado.",
    };
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parsePin(String(new FormData(event.currentTarget).get("pin") ?? ""));
    if ("error" in parsed) {
      setPinError(parsed.error);
      return;
    }
    setPinError(undefined);
    if (await run(() => register(parsed.pin))) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Registrar
        </Button>
      </DialogTrigger>
      <DialogContent title="Registrar número" description={label} className="max-w-md">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-body">
            Meta pide registrar el número con un PIN de 6 dígitos para que envíe y reciba mensajes
            por la API.
          </p>
          <Field
            label="PIN de verificación en dos pasos"
            htmlFor={`pin-${phoneNumberId}`}
            help="Si el número ya tiene verificación en dos pasos, escribe ese PIN. Si lo dejas vacío, se usa el PIN guardado o se crea uno nuevo."
            error={pinError}
          >
            <InputPassword
              etiqueta="PIN"
              id={`pin-${phoneNumberId}`}
              name="pin"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              aria-invalid={pinError ? true : undefined}
            />
          </Field>

          <div className="mt-2 flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? "Registrando…" : "Registrar número"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
