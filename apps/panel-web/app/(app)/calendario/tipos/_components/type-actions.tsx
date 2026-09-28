"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/** Alta de un tipo de cita. */
export function NewTypeForm() {
  const router = useRouter();
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus({ loading: true });
    const res = await fetch("/api/pack/calendar/types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(data.get("name") ?? ""),
        duration_minutes: Number(data.get("duration_minutes") ?? 60),
        description: String(data.get("description") ?? ""),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo crear el tipo." });
      return;
    }
    form.reset();
    setStatus({ success: "Tipo creado." });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <Field label="Nombre" htmlFor="t-name" required className="w-56">
        <Input id="t-name" name="name" required />
      </Field>
      <Field label="Duración (min)" htmlFor="t-dur" className="w-36">
        <Input id="t-dur" name="duration_minutes" type="number" min={5} defaultValue={60} />
      </Field>
      <Field label="Descripción" htmlFor="t-desc" className="w-72">
        <Textarea id="t-desc" name="description" rows={1} />
      </Field>
      <Button type="submit" variant="accent" disabled={status.loading}>
        {status.loading ? "Creando…" : "Crear tipo"}
      </Button>
      <FormFeedback error={status.error} success={status.success} />
    </form>
  );
}

/** Elimina (soft-delete) un tipo de cita. */
export function DeleteTypeButton({ typeId, label }: { typeId: string; label: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    setLoading(true);
    await fetch(`/api/pack/calendar/types/${typeId}/delete`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => void remove()}
      disabled={loading}
      aria-label={`Eliminar ${label}`}
    >
      Eliminar
    </Button>
  );
}
