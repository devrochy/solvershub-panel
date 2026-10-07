"use client";

import { useState, type FormEvent } from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/confirm";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { CollaboratorItem } from "@/lib/api/types";
import { seccionLabel } from "@/lib/labels";
import { useAction } from "@/lib/use-action";

type Action = "password" | "grant" | "revoke" | "link" | "toggle";

/** Acciones de una cuenta: contraseña, permisos, vínculo y activar/desactivar. */
export function CollaboratorActions({
  collaborator,
  sections,
}: {
  collaborator: CollaboratorItem;
  sections: string[];
}) {
  const confirm = useConfirm();
  const { run, pending } = useAction();
  const [open, setOpen] = useState(false);

  async function post(action: Action, payload: Record<string, unknown> = {}) {
    const res = await fetch(`/api/collaborators/${collaborator.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: res.ok, error: json.error };
  }

  async function toggle() {
    if (collaborator.active) {
      const aceptado = await confirm({
        title: "Desactivar colaborador",
        description:
          "Quedará sin acceso al panel y sus permisos dejarán de aplicar hasta que lo reactives.",
        confirmLabel: "Desactivar",
        destructive: true,
      });
      if (!aceptado) return;
    }
    await run(() => post("toggle"));
  }

  function onPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run(() => post("password", { password: String(data.get("password") ?? "") }));
  }

  function onGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run(() =>
      post("grant", {
        section: String(data.get("section") ?? ""),
        access: String(data.get("access") ?? "read"),
        tenant: String(data.get("tenant") ?? ""),
      }),
    );
  }

  function onRevoke(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run(() =>
      post("revoke", {
        section: String(data.get("section") ?? ""),
        tenant: String(data.get("tenant") ?? ""),
      }),
    );
  }

  function onLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run(() =>
      post("link", {
        tenant: String(data.get("tenant") ?? ""),
        role: String(data.get("role") ?? "colaborador"),
      }),
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Acciones de ${collaborator.email}`}>
          <MoreHorizontal className="h-4 w-4" aria-hidden />
          Acciones
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Acciones de la cuenta"
        description={collaborator.email}
        className="max-w-xl"
      >
        <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pr-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-body">
              {collaborator.active ? "Cuenta activa" : "Cuenta inactiva"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void toggle()}
              disabled={pending}
            >
              {collaborator.active ? "Desactivar" : "Activar"}
            </Button>
          </div>

          <Separator />

          <form onSubmit={onPassword} className="flex flex-col gap-3">
            <p className="text-sm font-medium text-headline">Restablecer contraseña</p>
            <Field label="Nueva contraseña" htmlFor={`pw-${collaborator.id}`} required>
              <Input
                id={`pw-${collaborator.id}`}
                name="password"
                type="password"
                required
                autoComplete="new-password"
              />
            </Field>
            <div>
              <Button type="submit" variant="outline" size="sm" disabled={pending}>
                Cambiar contraseña
              </Button>
            </div>
          </form>

          <Separator />

          <form onSubmit={onGrant} className="flex flex-col gap-3">
            <p className="text-sm font-medium text-headline">Otorgar permiso</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Sección" htmlFor={`sec-${collaborator.id}`}>
                <Select id={`sec-${collaborator.id}`} name="section">
                  {sections.map((section) => (
                    <option key={section} value={section}>
                      {seccionLabel(section)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Acceso" htmlFor={`acc-${collaborator.id}`}>
                <Select id={`acc-${collaborator.id}`} name="access" defaultValue="read">
                  <option value="read">Lectura</option>
                  <option value="write">Escritura</option>
                </Select>
              </Field>
              <Field label="Negocio" htmlFor={`gten-${collaborator.id}`} help="Vacío = global.">
                <Input id={`gten-${collaborator.id}`} name="tenant" placeholder="slug" />
              </Field>
            </div>
            <div>
              <Button type="submit" variant="outline" size="sm" disabled={pending}>
                Otorgar
              </Button>
            </div>
          </form>

          <Separator />

          <form onSubmit={onRevoke} className="flex flex-col gap-3">
            <p className="text-sm font-medium text-headline">Revocar permiso</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Sección" htmlFor={`rsec-${collaborator.id}`}>
                <Select id={`rsec-${collaborator.id}`} name="section">
                  {sections.map((section) => (
                    <option key={section} value={section}>
                      {seccionLabel(section)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Negocio" htmlFor={`rten-${collaborator.id}`} help="Vacío = global.">
                <Input id={`rten-${collaborator.id}`} name="tenant" placeholder="slug" />
              </Field>
            </div>
            <div>
              <Button type="submit" variant="outline" size="sm" disabled={pending}>
                Revocar
              </Button>
            </div>
          </form>

          <Separator />

          <form onSubmit={onLink} className="flex flex-col gap-3">
            <p className="text-sm font-medium text-headline">Vincular a un negocio</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Negocio" htmlFor={`lten-${collaborator.id}`} required>
                <Input id={`lten-${collaborator.id}`} name="tenant" required placeholder="slug" />
              </Field>
              <Field label="Rol" htmlFor={`lrol-${collaborator.id}`}>
                <Select id={`lrol-${collaborator.id}`} name="role" defaultValue="colaborador">
                  <option value="colaborador">Colaborador</option>
                  <option value="owner">Propietario</option>
                </Select>
              </Field>
            </div>
            <div>
              <Button type="submit" variant="outline" size="sm" disabled={pending}>
                Vincular
              </Button>
            </div>
          </form>

          <div className="flex justify-end">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Cerrar
              </Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
