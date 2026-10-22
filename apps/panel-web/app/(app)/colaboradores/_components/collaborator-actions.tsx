"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, Link2, ShieldCheck, User } from "lucide-react";

import { SelectorDeNegocio } from "@/app/(app)/colaboradores/_components/selector-de-negocio";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/confirm";
import { Field } from "@/components/ui/field";
import { IconAction } from "@/components/ui/icon-action";
import { InputPassword } from "@/components/ui/input-password";
import { SelectConIcono, type Opcion } from "@/components/ui/select-con-icono";
import type { CollaboratorItem } from "@/lib/api/types";
import { vinculoLegible } from "@/lib/colaboradores";
import { useAction } from "@/lib/use-action";

type Action = "password" | "link" | "unlink";

type Dialogo = "contrasena" | "vinculos";

const ROLES_VINCULO: Opcion[] = [
  { value: "colaborador", label: "Colaborador", icono: <User aria-hidden className="h-4 w-4" /> },
  { value: "owner", label: "Propietario", icono: <ShieldCheck aria-hidden className="h-4 w-4" /> },
];

/**
 * Acciones de una cuenta, por icono en la fila (HU-UI-15): restablecer contraseña y vínculos.
 * El estado (activar/desactivar) vive en su propia columna, con interruptor y confirmación.
 */
export function CollaboratorActions({
  collaborator,
  esMaster = false,
}: {
  collaborator: CollaboratorItem;
  esMaster?: boolean;
}) {
  const confirm = useConfirm();
  const { run, pending } = useAction();
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [negocio, setNegocio] = useState<{ slug: string; name: string } | null>(null);
  const [rolVinculo, setRolVinculo] = useState("colaborador");

  async function post(action: Action, payload: Record<string, unknown> = {}, success?: string) {
    const res = await fetch(`/api/collaborators/${collaborator.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: res.ok, status: res.status, error: json.error, success };
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

  function vincular() {
    if (!negocio) return;
    void run(async () => {
      const el = await post("link", { tenant: negocio.slug, role: rolVinculo }, "Cuenta vinculada al negocio.");
      if (el.ok) {
        setNegocio(null);
        setRolVinculo("colaborador");
      }
      return el;
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Dialog open={dialogo === "contrasena"} onOpenChange={(o) => setDialogo(o ? "contrasena" : null)}>
        <DialogTrigger asChild>
          <IconAction label={`Restablecer contraseña de ${collaborator.email}`} tone="editar">
            <KeyRound className="h-4 w-4" aria-hidden />
          </IconAction>
        </DialogTrigger>
        <DialogContent title="Restablecer contraseña" description={collaborator.email} className="max-w-md">
          <form onSubmit={onPassword} className="flex flex-col gap-3">
            <Field label="Nueva contraseña" htmlFor={`pw-${collaborator.id}`} required>
              <InputPassword
                id={`pw-${collaborator.id}`}
                name="password"
                required
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="sm">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" variant="outline" size="sm" disabled={pending}>
                Cambiar contraseña
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {(esMaster || (collaborator.links.length > 0 && !collaborator.is_self)) && (
        <Dialog open={dialogo === "vinculos"} onOpenChange={(o) => setDialogo(o ? "vinculos" : null)}>
          <DialogTrigger asChild>
            <IconAction label={`Vínculos de ${collaborator.email}`} tone="neutro">
              <Link2 className="h-4 w-4" aria-hidden />
            </IconAction>
          </DialogTrigger>
          <DialogContent title="Negocios vinculados" description={collaborator.email} className="max-w-xl">
            <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pr-1">
              {esMaster && (
                <section className="flex flex-col gap-3 rounded-lg border border-border-soft bg-surface-2 p-3">
                  <p className="text-sm font-medium text-headline">Vincular a un negocio</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Negocio" htmlFor={`lten-${collaborator.id}`}>
                      <SelectorDeNegocio
                        id={`lten-${collaborator.id}`}
                        label="Negocio"
                        value={negocio?.slug ?? ""}
                        nombre={negocio?.name}
                        onChange={(slug, name) => setNegocio({ slug, name })}
                      />
                    </Field>
                    <Field label="Rol" htmlFor={`lrol-${collaborator.id}`}>
                      <SelectConIcono
                        id={`lrol-${collaborator.id}`}
                        label="Rol"
                        value={rolVinculo}
                        onChange={setRolVinculo}
                        options={ROLES_VINCULO}
                      />
                    </Field>
                  </div>
                  <div>
                    <Button type="button" variant="outline" size="sm" onClick={vincular} disabled={pending || !negocio}>
                      Vincular
                    </Button>
                  </div>
                </section>
              )}

              <section className="flex flex-col gap-3">
                <p className="text-sm font-medium text-headline">Vínculos actuales</p>
                {collaborator.links.length === 0 ? (
                  <p className="text-sm text-text-soft">Todavía no está vinculada a ningún negocio.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {collaborator.links.map((link) => (
                      <li
                        key={`${link.slug}-${link.role}`}
                        className="flex items-center justify-between gap-3 rounded-md border border-border-soft px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate text-body">{vinculoLegible(link)}</span>
                        {!collaborator.is_self && (
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
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
