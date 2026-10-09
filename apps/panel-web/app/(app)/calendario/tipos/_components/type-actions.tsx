"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { enlaceValido } from "@/lib/citas";

export type Responsable = { id: string; email: string };
export type TipoCita = {
  id: string;
  name: string;
  duration_minutes: number;
  description: string;
  responsable_admin_id?: string | null;
  enlace_reunion?: string | null;
};

/** Cuerpo de alta/edición de un tipo (HU-SH-02: responsable y enlace de la reunión). */
function cuerpoTipo(data: FormData): Record<string, unknown> | string {
  const enlace = String(data.get("enlace_reunion") ?? "").trim();
  if (!enlaceValido(enlace)) return "El enlace de la reunión tiene que empezar con https://.";
  return {
    name: String(data.get("name") ?? ""),
    duration_minutes: Number(data.get("duration_minutes") ?? 60),
    description: String(data.get("description") ?? ""),
    responsable_admin_id: String(data.get("responsable_admin_id") ?? "") || null,
    enlace_reunion: enlace,
  };
}

function CamposExtra({ responsables, tipo, sufijo }: { responsables: Responsable[]; tipo?: TipoCita; sufijo: string }) {
  return (
    <>
      <Field label="Responsable" htmlFor={`t-resp-${sufijo}`} help="Recibe el aviso de cada cita de este tipo." className="w-56">
        <Select id={`t-resp-${sufijo}`} name="responsable_admin_id" defaultValue={tipo?.responsable_admin_id ?? ""}>
          <option value="">Dueños del negocio</option>
          {responsables.map((r) => (
            <option key={r.id} value={r.id}>
              {r.email}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Enlace de la reunión" htmlFor={`t-link-${sufijo}`} help="Meet, Zoom… (vacío = el general)." className="w-72">
        <Input id={`t-link-${sufijo}`} name="enlace_reunion" type="url" placeholder="https://" defaultValue={tipo?.enlace_reunion ?? ""} />
      </Field>
    </>
  );
}

/** Alta de un tipo de cita. */
export function NewTypeForm({ responsables = [] }: { responsables?: Responsable[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const cuerpo = cuerpoTipo(data);
    if (typeof cuerpo === "string") {
      setStatus({ error: cuerpo });
      return;
    }
    setStatus({ loading: true });
    const res = await fetch("/api/pack/calendar/types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
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
      <CamposExtra responsables={responsables} sufijo="nuevo" />
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
      aria-label={`Eliminar ${label}`}
      disabled={loading}
      onClick={() => void remove()}
      size="icon"
      title={`Eliminar ${label}`}
      variant="ghost"
    >
      <Trash2 className="h-4 w-4 text-danger" aria-hidden />
    </Button>
  );
}

/** Edición de un tipo de cita (HU-SH-02). */
export function EditTypeDialog({ tipo, responsables }: { tipo: TipoCita; responsables: Responsable[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cuerpo = cuerpoTipo(new FormData(event.currentTarget));
    if (typeof cuerpo === "string") {
      setStatus({ error: cuerpo });
      return;
    }
    setStatus({ loading: true });
    const res = await fetch(`/api/pack/calendar/types/${tipo.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo guardar el tipo." });
      return;
    }
    setStatus({});
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button aria-label={`Editar ${tipo.name}`} size="icon" title={`Editar ${tipo.name}`} variant="ghost">
          <Pencil className="h-4 w-4" aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent title={`Editar ${tipo.name}`} description="Duración, responsable y enlace de la reunión.">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Field label="Nombre" htmlFor={`t-name-${tipo.id}`} required>
            <Input id={`t-name-${tipo.id}`} name="name" required defaultValue={tipo.name} />
          </Field>
          <Field label="Duración (min)" htmlFor={`t-dur-${tipo.id}`}>
            <Input id={`t-dur-${tipo.id}`} name="duration_minutes" type="number" min={5} defaultValue={tipo.duration_minutes} />
          </Field>
          <Field label="Descripción" htmlFor={`t-desc-${tipo.id}`}>
            <Textarea id={`t-desc-${tipo.id}`} name="description" rows={2} defaultValue={tipo.description} />
          </Field>
          <CamposExtra responsables={responsables} tipo={tipo} sufijo={tipo.id} />
          <div className="flex justify-end">
            <Button type="submit" variant="accent" disabled={status.loading}>
              {status.loading ? "Guardando…" : "Guardar"}
            </Button>
          </div>
          <FormFeedback error={status.error} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
