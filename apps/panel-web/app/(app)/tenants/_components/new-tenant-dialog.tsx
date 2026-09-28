"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

/** Alta de negocio (tenant) desde plataforma. */
export function NewTenantDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus({ loading: true });
    const res = await fetch("/api/platform/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(data.get("name") ?? ""),
        slug: String(data.get("slug") ?? ""),
        business: String(data.get("business") ?? ""),
        tone: String(data.get("tone") ?? "cercano"),
        admin_email: String(data.get("admin_email") ?? ""),
        admin_password: String(data.get("admin_password") ?? ""),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo crear el negocio." });
      return;
    }
    setStatus({});
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent">Nuevo negocio</Button>
      </DialogTrigger>
      <DialogContent
        title="Nuevo negocio"
        description="Da de alta un tenant con su asistente y, si quieres, su cuenta admin."
        className="max-w-xl"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="t-name" required>
              <Input id="t-name" name="name" required />
            </Field>
            <Field label="Slug" htmlFor="t-slug" help="Vacío = se deriva del nombre.">
              <Input id="t-slug" name="slug" autoComplete="off" />
            </Field>
          </div>
          <Field label="Descripción del negocio" htmlFor="t-business">
            <Input id="t-business" name="business" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tono" htmlFor="t-tone">
              <Select id="t-tone" name="tone" defaultValue="cercano">
                <option value="cercano">Cercano</option>
                <option value="formal">Formal</option>
                <option value="neutral">Neutral</option>
                <option value="informal">Informal</option>
              </Select>
            </Field>
            <Field label="Email del admin" htmlFor="t-email">
              <Input id="t-email" name="admin_email" type="email" autoComplete="off" />
            </Field>
            <Field label="Contraseña" htmlFor="t-pass" help="Mínimo 8 caracteres.">
              <Input id="t-pass" name="admin_password" type="password" autoComplete="new-password" />
            </Field>
          </div>

          <FormFeedback error={status.error} />

          <div className="mt-2 flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="accent" disabled={status.loading}>
              {status.loading ? "Creando…" : "Crear negocio"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
