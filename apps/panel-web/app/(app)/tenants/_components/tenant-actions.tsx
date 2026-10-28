"use client";

import { useRef, useState, type FormEvent } from "react";
import { Settings2, Trash2 } from "lucide-react";

import { AgentOSSection } from "@/app/(app)/tenants/_components/agent-os-section";
import { AliadosSection } from "@/app/(app)/tenants/_components/aliados-section";
import { AvisosPorCanalSection } from "@/app/(app)/tenants/_components/avisos-por-canal-section";
import { OpcionesDirectasSection } from "@/app/(app)/tenants/_components/opciones-directas-section";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { IconAction } from "@/components/ui/icon-action";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { mensajeAcceso } from "@/lib/acceso-dueno";
import type { PlatformTenant, TenantOwnerInvitation } from "@/lib/api/types";
import { AVISO_DESACTIVAR_PRIMERO, sePuedeEliminar } from "@/lib/eliminar-negocio";
import { estadoDelPlan } from "@/lib/estados-negocio";
import { formatDate } from "@/lib/format";
import { useAction } from "@/lib/use-action";

/** Acciones de gestión y eliminación de un negocio (master). */
export function TenantActions({
  tenant,
  esMaster = false,
  abrirInicial = false,
}: {
  tenant: PlatformTenant;
  /** Solo el admin de plataforma ve los interruptores de plantillas con opciones y de avisos por canal (el tester no). */
  esMaster?: boolean;
  /** Llega por el enlace del editor de plantillas con opciones: abre el diálogo ya en el interruptor. */
  abrirInicial?: boolean;
}) {
  const [gestionarOpen, setGestionarOpen] = useState(abrirInicial && esMaster);
  const [eliminarOpen, setEliminarOpen] = useState(false);
  const gestionarBoton = useRef<HTMLElement>(null);
  const eliminarBoton = useRef<HTMLElement>(null);
  const { run: ejecutar, pending } = useAction();
  const activo = tenant.status === "active";
  const eliminable = sePuedeEliminar(tenant.status);
  const nombre = tenant.name || tenant.slug;
  const plan = estadoDelPlan(tenant);

  const AVISOS: Record<string, string> = {
    deactivate: "Negocio desactivado.",
    purge: "Negocio eliminado.",
  };

  async function run(action: string, payload: Record<string, unknown> = {}) {
    return ejecutar(async () => {
      const res = await fetch(`/api/platform/tenants/${tenant.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; invitation?: TenantOwnerInvitation };
      if (!res.ok) return { ok: false, status: res.status, error: json.error ?? "No se pudo completar la acción." };
      if (action === "resend_access" && json.invitation) {
        const m = mensajeAcceso(json.invitation, { reenvio: true });
        // Un correo que no salió no es un éxito: se muestra como error para que no pase de largo.
        return m.tono === "aviso" ? { ok: false, error: m.texto } : { ok: true, success: m.texto };
      }
      return { ok: true, success: AVISOS[action] ?? "Listo." };
    });
  }

  async function onPurge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const ok = await run("purge", { confirm_phrase: String(data.get("confirm_phrase") ?? "") });
    if (ok) setEliminarOpen(false);
  }

  return (
    <>
      <div className="flex justify-end gap-1">
        <IconAction
          ref={gestionarBoton}
          tone="neutro"
          label={`Gestionar ${nombre}`}
          onClick={() => setGestionarOpen(true)}
        >
          <Settings2 className="h-4 w-4" aria-hidden />
        </IconAction>
        <IconAction
          ref={eliminarBoton}
          tone="eliminar"
          label={`Eliminar ${nombre}`}
          onClick={() => setEliminarOpen(true)}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </IconAction>
      </div>

      <Dialog open={gestionarOpen} onOpenChange={setGestionarOpen}>
        <DialogContent
          title="Gestionar negocio"
          description={`${nombre} · ${tenant.slug}`}
          className="max-w-xl"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            gestionarBoton.current?.focus();
          }}
        >
          <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pr-1">
            <div className="flex flex-col gap-1 text-sm text-body">
              <p>
                Plan actual: <span className="text-headline">{plan.label}</span>
              </p>
              <p>
                Creado: <span className="text-headline">{formatDate(tenant.created_at)}</span>
              </p>
            </div>

            <Separator />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-headline">Acceso del dueño</p>
                <p className="text-sm text-body">
                  Vuelve a enviar el correo con el enlace para definir la contraseña, mientras el dueño no haya entrado.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void run("resend_access")}
                disabled={pending || !activo}
              >
                Reenviar acceso
              </Button>
            </div>

            <Separator />

            {esMaster && (
              <>
                <OpcionesDirectasSection
                  tenantId={tenant.id}
                  negocio={nombre}
                  enfocar={abrirInicial}
                />

                <Separator />

                <AvisosPorCanalSection tenantId={tenant.id} negocio={nombre} />

                <Separator />
              </>
            )}

            <AgentOSSection tenantId={tenant.id} />

            <Separator />

            <AliadosSection tenantId={tenant.id} />

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

      <Dialog open={eliminarOpen} onOpenChange={setEliminarOpen}>
        <DialogContent
          title="Eliminar negocio"
          description={`${nombre} · ${tenant.slug}. Borra todos sus datos y no se puede deshacer.`}
          className="max-w-lg"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            eliminarBoton.current?.focus();
          }}
        >
          <form onSubmit={onPurge} className="flex flex-col gap-3">
            {!eliminable && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border-soft p-3">
                <p className="text-sm text-body">{AVISO_DESACTIVAR_PRIMERO}</p>
                {activo && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void run("deactivate")}
                    disabled={pending}
                  >
                    Desactivar
                  </Button>
                )}
              </div>
            )}
            <Field
              label="Escribe la frase de confirmación"
              htmlFor={`purge-${tenant.id}`}
              help={`Debe ser exactamente: ELIMINAR ${tenant.slug}`}
            >
              <Input
                id={`purge-${tenant.id}`}
                name="confirm_phrase"
                placeholder={`ELIMINAR ${tenant.slug}`}
                autoComplete="off"
                disabled={!eliminable || pending}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={pending}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" variant="danger" disabled={pending || !eliminable}>
                Eliminar definitivamente
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
