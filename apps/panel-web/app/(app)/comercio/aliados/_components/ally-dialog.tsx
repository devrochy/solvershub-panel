"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { contactoDelFormulario, type Aliado } from "@/lib/aliados";

/** Alta/edición de un aliado (proveedor) del negocio (HU-CRM-03). */
export function AllyDialog({ ally }: { ally?: Aliado }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(ally?.active ?? true);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus({ loading: true });
    const res = await fetch(ally ? `/api/pack/commerce/allies/${ally.id}` : "/api/pack/commerce/allies", {
      method: ally ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(data.get("name") ?? "").trim(),
        contact_info: contactoDelFormulario(data),
        active,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo guardar el aliado." });
      return;
    }
    setStatus({});
    setOpen(false);
    router.refresh();
  }

  const c = ally?.contact_info ?? {};
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {ally ? (
          <Button aria-label="Editar" size="icon" title="Editar" variant="outline"><Pencil className="h-4 w-4" aria-hidden /></Button>
        ) : (
          <Button variant="accent">Nuevo aliado</Button>
        )}
      </DialogTrigger>
      <DialogContent
        title={ally ? "Editar aliado" : "Nuevo aliado"}
        description="Proveedor cuyos productos vendes. Agrupa el catálogo y limita promociones."
        className="max-w-lg"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Nombre" htmlFor="a-name" required help="Es el que va en la columna «aliado» del CSV.">
            <Input id="a-name" name="name" required maxLength={120} defaultValue={ally?.name ?? ""} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contacto" htmlFor="a-contacto">
              <Input id="a-contacto" name="contacto" maxLength={120} defaultValue={c.contacto ?? ""} />
            </Field>
            <Field label="Teléfono" htmlFor="a-telefono">
              <Input id="a-telefono" name="telefono" type="tel" maxLength={40} defaultValue={c.telefono ?? ""} />
            </Field>
          </div>
          <Field label="Correo" htmlFor="a-email">
            <Input id="a-email" name="email" type="email" maxLength={254} defaultValue={c.email ?? ""} />
          </Field>
          <Field label="Notas" htmlFor="a-notas">
            <Input id="a-notas" name="notas" maxLength={500} defaultValue={c.notas ?? ""} />
          </Field>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-body">Activo</span>
            <Switch checked={active} onCheckedChange={setActive} aria-label="Aliado activo" />
          </label>
          <FormFeedback error={status.error} />
          <div className="mt-2 flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" aria-label="Cancelar" size="icon" title="Cancelar" variant="outline"><X className="h-4 w-4" aria-hidden /></Button>
            </DialogClose>
            <Button type="submit" variant="accent" disabled={status.loading}>
              {status.loading ? "Guardando…" : "Guardar aliado"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Borra (lógico) un aliado: sus productos quedan sin aliado y sus promociones se desactivan. */
export function DeleteAllyButton({ ally }: { ally: Aliado }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});

  async function remove() {
    setStatus({ loading: true });
    const res = await fetch(`/api/pack/commerce/allies/${ally.id}`, { method: "DELETE" });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo eliminar." });
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button aria-label="Eliminar" size="icon" title="Eliminar" variant="outline"><Trash2 className="h-4 w-4 text-status-danger-fg" aria-hidden /></Button>
      </DialogTrigger>
      <DialogContent title="Eliminar aliado" description={ally.name} className="max-w-md">
        <p className="text-sm text-body">
          {ally.products > 0
            ? `Sus ${ally.products} productos quedarán sin aliado. Sus promociones se desactivan.`
            : "Sus promociones se desactivan."}
        </p>
        <FormFeedback error={status.error} className="mt-3" />
        <div className="mt-6 flex justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" aria-label="Cancelar" size="icon" title="Cancelar" variant="outline"><X className="h-4 w-4" aria-hidden /></Button>
          </DialogClose>
          <Button type="button" variant="danger" onClick={() => void remove()} disabled={status.loading}>
            {status.loading ? "Eliminando…" : "Eliminar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
