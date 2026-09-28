"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";

/** Alta de un número telefónico en una conexión Meta. */
export function AddNumberDialog({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus({ loading: true });
    const res = await fetch(`/api/meta/connections/${connectionId}/numbers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cc: String(data.get("cc") ?? ""),
        phone_number: String(data.get("phone_number") ?? ""),
        verified_name: String(data.get("verified_name") ?? ""),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo agregar el número." });
      return;
    }
    setStatus({});
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent">Agregar número</Button>
      </DialogTrigger>
      <DialogContent
        title="Agregar número"
        description="Meta dará de alta el número en tu WABA; luego se verifica con un código."
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-[6rem_1fr]">
            <Field label="Código país" htmlFor="cc" required>
              <Input id="cc" name="cc" placeholder="57" required />
            </Field>
            <Field label="Número" htmlFor="phone" required>
              <Input id="phone" name="phone_number" placeholder="3001234567" required />
            </Field>
          </div>
          <Field label="Nombre verificado" htmlFor="vname" required>
            <Input id="vname" name="verified_name" required />
          </Field>

          <FormFeedback error={status.error} />

          <div className="mt-2 flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="accent" disabled={status.loading}>
              {status.loading ? "Agregando…" : "Agregar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
