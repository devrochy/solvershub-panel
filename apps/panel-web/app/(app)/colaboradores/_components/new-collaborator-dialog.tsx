"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

/** Alta de colaborador (diálogo). */
export function NewCollaboratorDialog({ packRoles = [] }: { packRoles?: { value: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus({ loading: true });
    const res = await fetch("/api/collaborators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
        role: String(data.get("role") ?? "colaborador"),
        username: String(data.get("username") ?? ""),
        tenant: String(data.get("tenant") ?? ""),
        pack_roles: data.getAll("pack_roles").map((v) => String(v)),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo crear la cuenta." });
      return;
    }
    setStatus({});
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent">Nuevo colaborador</Button>
      </DialogTrigger>
      <DialogContent
        title="Nuevo colaborador"
        description="Crea una cuenta de acceso al panel para tu equipo."
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Correo" htmlFor="new-email" required>
            <Input id="new-email" name="email" type="email" required autoComplete="off" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contraseña" htmlFor="new-password" required>
              <Input id="new-password" name="password" type="password" required autoComplete="new-password" />
            </Field>
            <Field label="Rol" htmlFor="new-role">
              <Select id="new-role" name="role" defaultValue="colaborador">
                <option value="colaborador">Colaborador</option>
                <option value="owner">Propietario</option>
                <option value="master">Master (plataforma)</option>
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Usuario" htmlFor="new-username" help="Opcional.">
              <Input id="new-username" name="username" autoComplete="off" />
            </Field>
            <Field
              label="Negocio"
              htmlFor="new-tenant"
              help="Slug del negocio (vacío = sin vínculo)."
            >
              <Input id="new-tenant" name="tenant" autoComplete="off" />
            </Field>
          </div>

          {packRoles.length > 0 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-[13px] font-medium text-body">
                Roles por habilidad (opcional)
              </legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {packRoles.map((role) => (
                  <label key={role.value} className="flex items-center gap-2 text-sm text-headline">
                    <input
                      type="checkbox"
                      name="pack_roles"
                      value={role.value}
                      className="h-4 w-4 rounded border-control-border bg-bg-deep accent-[var(--sh-blue-500)]"
                    />
                    {role.label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <FormFeedback error={status.error} />

          <div className="mt-2 flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">Cancelar</Button>
            </DialogClose>
            <Button type="submit" variant="accent" disabled={status.loading}>
              {status.loading ? "Creando…" : "Crear cuenta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
