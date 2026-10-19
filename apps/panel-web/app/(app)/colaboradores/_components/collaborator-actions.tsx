"use client";

import { useState, type FormEvent } from "react";
import { MoreHorizontal } from "lucide-react";

import { CampoDeNegocio } from "@/app/(app)/colaboradores/_components/campo-de-negocio";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/confirm";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { CollaboratorItem } from "@/lib/api/types";
import { vinculoLegible } from "@/lib/colaboradores";
import { seccionLabel } from "@/lib/labels";
import { useAction } from "@/lib/use-action";

type Action = "password" | "grant" | "revoke" | "link" | "unlink" | "toggle";

/**
 * Acciones de una cuenta: contraseña, permisos, vínculos y activar/desactivar. El campo de
 * negocio (slug con autocompletado) y «Vincular» son solo del master: un dueño gestiona su
 * negocio y la API ya lo resuelve con el negocio activo.
 */
export function CollaboratorActions({
  collaborator,
  sections,
  esMaster = false,
}: {
  collaborator: CollaboratorItem;
  sections: string[];
  esMaster?: boolean;
}) {
  const confirm = useConfirm();
  const { run, pending } = useAction();
  const [open, setOpen] = useState(false);

  async function post(action: Action, payload: Record<string, unknown> = {}, success?: string) {
    const res = await fetch(`/api/collaborators/${collaborator.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: res.ok, status: res.status, error: json.error, success };
  }

  async function toggle() {
    if (collaborator.active) {
      const aceptado = await confirm({
        title: "Desactivar colaborador",
        description:
          "Quedará sin acceso al panel y sus permisos dejarán de aplicar hasta que lo reactives. Libera su cupo de colaboradores del plan; para reactivarlo necesitarás cupo.",
        confirmLabel: "Desactivar",
        destructive: true,
      });
      if (!aceptado) return;
    }
    await run(() => post("toggle", {}, collaborator.active ? "Cuenta desactivada." : "Cuenta activada."));
  }

  async function desvincular(link: CollaboratorItem["links"][number]) {
    const aceptado = await confirm({
      title: `Desvincular de ${link.name}`,
      description:
        "La cuenta deja de ver ese negocio y sus permisos ahí dejan de aplicar. Para volver, habrá que vincularla o invitarla de nuevo.",
      confirmLabel: "Desvincular",
      destructive: true,
    });
    if (!aceptado) return;
    await run(() => post("unlink", { tenant: link.slug }, `Cuenta desvinculada de ${link.name}.`));
  }

  function onPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run(() => post("password", { password: String(data.get("password") ?? "") }, "Contraseña cambiada."));
  }

  function onGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run(() =>
      post(
        "grant",
        {
          section: String(data.get("section") ?? ""),
          access: String(data.get("access") ?? "read"),
          tenant: String(data.get("tenant") ?? ""),
        },
        "Permiso otorgado.",
      ),
    );
  }

  function onRevoke(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run(() =>
      post(
        "revoke",
        {
          section: String(data.get("section") ?? ""),
          tenant: String(data.get("tenant") ?? ""),
        },
        "Permiso revocado.",
      ),
    );
  }

  function onLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run(() =>
      post(
        "link",
        {
          tenant: String(data.get("tenant") ?? ""),
          role: String(data.get("role") ?? "colaborador"),
        },
        "Cuenta vinculada al negocio.",
      ),
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
            {!collaborator.is_self && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void toggle()}
                disabled={pending}
              >
                {collaborator.active ? "Desactivar" : "Activar"}
              </Button>
            )}
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
            <div className={esMaster ? "grid gap-3 sm:grid-cols-3" : "grid gap-3 sm:grid-cols-2"}>
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
                  {/* Denegación explícita por sección (contrato de fix/p0-seguridad-pruebas). */}
                  <option value="none">Sin acceso</option>
                </Select>
              </Field>
              {esMaster && (
                <CampoDeNegocio id={`gten-${collaborator.id}`} help="Vacío = en todos los negocios." />
              )}
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
            <div className={esMaster ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
              <Field label="Sección" htmlFor={`rsec-${collaborator.id}`}>
                <Select id={`rsec-${collaborator.id}`} name="section">
                  {sections.map((section) => (
                    <option key={section} value={section}>
                      {seccionLabel(section)}
                    </option>
                  ))}
                </Select>
              </Field>
              {esMaster && (
                <CampoDeNegocio id={`rten-${collaborator.id}`} help="Vacío = el permiso global." />
              )}
            </div>
            <div>
              <Button type="submit" variant="outline" size="sm" disabled={pending}>
                Revocar
              </Button>
            </div>
          </form>

          {collaborator.links.length > 0 && !collaborator.is_self && (
            <>
              <Separator />
              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium text-headline">Negocios vinculados</p>
                <ul className="flex flex-col gap-2">
                  {collaborator.links.map((link) => (
                    <li key={`${link.slug}-${link.role}`} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-body">{vinculoLegible(link)}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void desvincular(link)}
                        disabled={pending}
                        aria-label={`Desvincular de ${link.name}`}
                      >
                        Desvincular
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {esMaster && (
            <>
              <Separator />
              <form onSubmit={onLink} className="flex flex-col gap-3">
                <p className="text-sm font-medium text-headline">Vincular a un negocio</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CampoDeNegocio id={`lten-${collaborator.id}`} required />
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
            </>
          )}

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
