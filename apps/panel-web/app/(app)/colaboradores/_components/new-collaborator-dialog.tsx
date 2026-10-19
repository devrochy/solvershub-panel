"use client";

import { useState, type FormEvent } from "react";

import { CampoDeNegocio } from "@/app/(app)/colaboradores/_components/campo-de-negocio";
import { AvisoLimiteDePlan } from "@/components/domain/aviso-limite-de-plan";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { mensajeDeAlta } from "@/lib/colaboradores";
import { esLimiteDePlan } from "@/lib/plan-limite";
import { useAction } from "@/lib/use-action";

/**
 * Alta de colaborador (diálogo). Si el correo ya tiene cuenta, la API no la duplica: envía
 * una invitación al negocio y lo dice en `resultado`; el aviso lo cuenta. El negocio (slug
 * con autocompletado) y el rol master son solo del master: un dueño da de alta en el suyo.
 */
export function NewCollaboratorDialog({
  packRoles = [],
  esMaster = false,
}: {
  packRoles?: { value: string; label: string }[];
  esMaster?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [limite, setLimite] = useState<string | null>(null);
  const { run, pending } = useAction();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const ok = await run(async () => {
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
      const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string; resultado?: string };
      if (!res.ok) {
        // Tope de colaboradores del plan (HU-BILL-05): no se creó ni se invitó a nadie.
        setLimite(esLimiteDePlan(json.code) ? (json.error ?? "Llegaste al tope de colaboradores de tu plan.") : null);
        return { ok: false, status: res.status, error: json.error ?? "No se pudo crear la cuenta." };
      }
      setLimite(null);
      return { ok: true, success: mensajeDeAlta(json.resultado) };
    });
    if (ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent">Nuevo colaborador</Button>
      </DialogTrigger>
      <DialogContent
        title="Nuevo colaborador"
        description="Crea una cuenta de acceso al panel. Si el correo ya tiene cuenta, se le envía una invitación al negocio."
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
                {esMaster && <option value="master">Master (plataforma)</option>}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Usuario" htmlFor="new-username" help="Opcional.">
              <Input id="new-username" name="username" autoComplete="off" />
            </Field>
            {esMaster && <CampoDeNegocio id="new-tenant" help="Vacío = cuenta sin negocio." />}
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

          {limite && <AvisoLimiteDePlan mensaje={limite} />}

          <div className="mt-2 flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">Cancelar</Button>
            </DialogClose>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? "Creando…" : "Crear cuenta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
