"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Tipo = { id: string; name: string; duration_minutes?: number | null };

/** Agenda una cita (y el evento en Google si el negocio lo tiene conectado). */
export function AppointmentDialog({ tipos }: { tipos: Tipo[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus({ loading: true });
    const res = await fetch("/api/pack/calendar/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: String(data.get("title") ?? ""),
        appointment_type_id: String(data.get("appointment_type_id") ?? "") || null,
        start_at: String(data.get("start_at") ?? ""),
        end_at: String(data.get("end_at") ?? ""),
        attendee_email: String(data.get("attendee_email") ?? ""),
        notes: String(data.get("notes") ?? ""),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setStatus({ loading: false });
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo agendar la cita." });
      return;
    }
    setOpen(false);
    form.reset();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent">
          <Plus className="h-4 w-4" aria-hidden /> Nueva cita
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Nueva cita"
        description="Si el negocio tiene Google Calendar conectado, se crea también el evento."
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Título" htmlFor="title">
            <Input id="title" name="title" required />
          </Field>
          <Field label="Tipo de cita" htmlFor="appointment_type_id">
            <Select id="appointment_type_id" name="appointment_type_id" defaultValue="">
              <option value="">Sin tipo</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.duration_minutes ? ` · ${t.duration_minutes} min` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Inicio" htmlFor="start_at">
              <Input id="start_at" name="start_at" required type="datetime-local" />
            </Field>
            <Field label="Fin" htmlFor="end_at">
              <Input id="end_at" name="end_at" required type="datetime-local" />
            </Field>
          </div>
          <Field label="Correo del asistente" htmlFor="attendee_email" help="Opcional; se invita desde Google.">
            <Input id="attendee_email" name="attendee_email" type="email" />
          </Field>
          <Field label="Notas" htmlFor="notes">
            <Textarea id="notes" name="notes" rows={2} />
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={status.loading}>
              {status.loading ? "Agendando…" : "Agendar cita"}
            </Button>
            <FormFeedback error={status.error} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
