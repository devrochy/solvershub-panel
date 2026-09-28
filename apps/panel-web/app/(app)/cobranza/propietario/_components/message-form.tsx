"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/** Añade un mensaje al hilo con el propietario. */
export function MessageForm() {
  const router = useRouter();
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus({ loading: true });
    const res = await fetch("/api/pack/cobranza/owner-thread/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contenido: String(data.get("contenido") ?? ""),
        direccion: String(data.get("direccion") ?? "saliente"),
      }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ error: json.error ?? "No se pudo registrar el mensaje." });
      return;
    }
    form.reset();
    setStatus({ success: "Mensaje registrado." });
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Mensaje" htmlFor="contenido">
            <Textarea id="contenido" name="contenido" placeholder="Escribe el mensaje para el propietario…" required rows={3} />
          </Field>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Dirección" htmlFor="direccion" className="w-44">
              <Select id="direccion" name="direccion" defaultValue="saliente">
                <option value="saliente">Saliente (nosotros)</option>
                <option value="entrante">Entrante (propietario)</option>
              </Select>
            </Field>
            <Button type="submit" disabled={status.loading}>
              {status.loading ? "Enviando…" : "Registrar mensaje"}
            </Button>
            <FormFeedback error={status.error} success={status.success} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
