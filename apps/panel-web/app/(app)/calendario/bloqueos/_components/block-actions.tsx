"use client";

import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";

/** Alta de un bloqueo de agenda (rango inicio/fin + motivo). */
export function BlockForm() {
  const router = useRouter();
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const inicio = String(data.get("start_at") ?? "");
    const fin = String(data.get("end_at") ?? "");
    setStatus({ loading: true });
    const res = await fetch("/api/pack/calendar/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start_at: inicio,
        end_at: fin,
        reason: String(data.get("reason") ?? ""),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo crear el bloqueo." });
      return;
    }
    form.reset();
    setStatus({ success: "Bloqueo creado." });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <Field label="Inicio" htmlFor="b-inicio" required>
        <Input id="b-inicio" name="start_at" type="datetime-local" required />
      </Field>
      <Field label="Fin" htmlFor="b-fin" required>
        <Input id="b-fin" name="end_at" type="datetime-local" required />
      </Field>
      <Field label="Motivo" htmlFor="b-motivo" className="w-64">
        <Input id="b-motivo" name="reason" placeholder="Vacaciones, feriado, almuerzo…" />
      </Field>
      <Button type="submit" variant="accent" disabled={status.loading}>
        {status.loading ? "Creando…" : "Crear bloqueo"}
      </Button>
      <FormFeedback error={status.error} success={status.success} />
    </form>
  );
}

/** Elimina (soft-delete) un bloqueo de agenda. */
export function DeleteBlockButton({ blockId, label }: { blockId: string; label: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    setLoading(true);
    await fetch(`/api/pack/calendar/blocks/${blockId}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button
      aria-label={`Eliminar bloqueo ${label}`}
      disabled={loading}
      onClick={() => void remove()}
      size="icon"
      title={`Eliminar bloqueo ${label}`}
      variant="ghost"
    >
      <Trash2 className="h-4 w-4 text-danger" aria-hidden />
    </Button>
  );
}
