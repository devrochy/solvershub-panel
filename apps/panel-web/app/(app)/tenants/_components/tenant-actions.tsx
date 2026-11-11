"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { AgentOSSection } from "@/app/(app)/tenants/_components/agent-os-section";
import { AliadosSection } from "@/app/(app)/tenants/_components/aliados-section";
import { AvisosPorCanalSection } from "@/app/(app)/tenants/_components/avisos-por-canal-section";
import { OpcionesDirectasSection } from "@/app/(app)/tenants/_components/opciones-directas-section";
import { TenantPlanBadge } from "@/app/(app)/tenants/_components/tenant-plan-badge";
import { TenantStatusToggle } from "@/app/(app)/tenants/_components/tenant-status-toggle";
import { MenuDeFila } from "@/components/domain/menu-de-fila";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { DropdownMenuItem, DropdownMenuLinkItem } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { mensajeAcceso } from "@/lib/acceso-dueno";
import type { PlanResponse, PlatformTenant, TenantOwnerInvitation } from "@/lib/api/types";
import { AVISO_DESACTIVAR_PRIMERO, sePuedeEliminar } from "@/lib/eliminar-negocio";
import { formatDate } from "@/lib/format";
import { useAction } from "@/lib/use-action";

const AVISOS: Record<string, string> = {
  deactivate: "Negocio desactivado.",
  purge: "Negocio eliminado.",
};

/** Acciones de la API sobre un negocio (master): reenviar acceso, desactivar y eliminar. */
function useAccionDeNegocio(tenantId: string) {
  const { run: ejecutar, pending } = useAction();
  async function run(action: string, payload: Record<string, unknown> = {}) {
    return ejecutar(async () => {
      const res = await fetch(`/api/platform/tenants/${tenantId}`, {
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
  return { run, pending };
}

/** Eliminar un negocio: pide la frase exacta y, si sigue activo, desactivarlo primero. */
export function EliminarNegocio({
  tenant,
  abierto,
  onAbierto,
}: {
  tenant: PlatformTenant;
  abierto: boolean;
  onAbierto: (abierto: boolean) => void;
}) {
  const { run, pending } = useAccionDeNegocio(tenant.id);
  const activo = tenant.status === "active";
  const eliminable = sePuedeEliminar(tenant.status);
  const nombre = tenant.name || tenant.slug;

  async function onPurge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const ok = await run("purge", { confirm_phrase: String(data.get("confirm_phrase") ?? "") });
    if (ok) onAbierto(false);
  }

  return (
    <Dialog open={abierto} onOpenChange={onAbierto}>
      <DialogContent
        title={`Eliminar ${nombre}`}
        description="Borra todos sus datos: conversaciones, clientes, pedidos y cuentas. No se puede deshacer."
        className="max-w-lg"
      >
        <form onSubmit={onPurge} className="flex flex-col gap-3">
          {!eliminable && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border-soft p-3">
              <p className="text-sm text-body">{AVISO_DESACTIVAR_PRIMERO}</p>
              {activo && (
                <Button type="button" variant="outline" size="sm" onClick={() => void run("deactivate")} disabled={pending}>
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
  );
}

/** Las acciones de la fila (PLT-01): abrir el negocio y eliminarlo, en «Más acciones». */
export function AccionesDeNegocio({ tenant, abrirHref }: { tenant: PlatformTenant; abrirHref: string }) {
  const [eliminar, setEliminar] = useState(false);
  const nombre = tenant.name || tenant.slug;
  return (
    <>
      <MenuDeFila etiqueta={`Más acciones de ${nombre}`}>
        <DropdownMenuLinkItem href={abrirHref} scroll={false}>
          Abrir
        </DropdownMenuLinkItem>
        <DropdownMenuItem tone="danger" onSelect={() => setEliminar(true)}>
          Eliminar negocio
        </DropdownMenuItem>
      </MenuDeFila>
      <EliminarNegocio tenant={tenant} abierto={eliminar} onAbierto={setEliminar} />
    </>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-3">
      <h3 className="text-sh-label uppercase tracking-[0.06em] text-text-soft">{titulo}</h3>
      <div className="flex flex-col gap-4 rounded-lg border border-border-soft bg-surface p-4">{children}</div>
    </section>
  );
}

function Fila({ nombre, detalle, children }: { nombre: string; detalle?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col">
        <span className="text-sm font-medium text-headline">{nombre}</span>
        {detalle && <span className="text-xs text-body">{detalle}</span>}
      </div>
      {children}
    </div>
  );
}

/**
 * El negocio en su cajón (PLT-02): vive en la URL (`?negocio=`) y se ordena en Cuenta, Funciones y
 * Asistente. Las funciones que se encienden por negocio solo las ve el master (el tester no).
 */
export function FichaDeNegocio({
  tenant,
  plans,
  esMaster,
  enfocarOpciones = false,
  cerrarHref,
}: {
  tenant: PlatformTenant;
  plans: PlanResponse["plans"];
  esMaster: boolean;
  /** Llega por el enlace del editor de plantillas con opciones: enfoca ese interruptor. */
  enfocarOpciones?: boolean;
  cerrarHref: string;
}) {
  const router = useRouter();
  const { run, pending } = useAccionDeNegocio(tenant.id);
  const [eliminar, setEliminar] = useState(false);
  const nombre = tenant.name || tenant.slug;
  const activo = tenant.status === "active";

  return (
    <Sheet
      open
      onOpenChange={(abierto) => {
        if (!abierto) router.replace(cerrarHref, { scroll: false });
      }}
    >
      <SheetContent
        title={nombre}
        description={`${tenant.slug} · creado el ${formatDate(tenant.created_at)}`}
        className="sm:max-w-xl"
        footer={
          <Button type="button" variant="ghost" className="text-status-danger-fg" onClick={() => setEliminar(true)}>
            Eliminar negocio
          </Button>
        }
      >
        <div className="flex flex-col gap-6">
          <Seccion titulo="Cuenta">
            <Fila nombre="Estado" detalle={activo ? "Atiende a sus clientes." : "No atiende hasta que lo reactives."}>
              <TenantStatusToggle tenant={tenant} />
            </Fila>
            <Fila nombre="Plan">
              <TenantPlanBadge tenant={tenant} plans={plans} />
            </Fila>
            <Fila nombre="Acceso del dueño" detalle="Reenvía el correo para definir la contraseña, mientras el dueño no haya entrado.">
              <Button variant="outline" size="sm" onClick={() => void run("resend_access")} disabled={pending || !activo}>
                Reenviar acceso
              </Button>
            </Fila>
          </Seccion>

          <Seccion titulo="Funciones">
            {esMaster && (
              <>
                <OpcionesDirectasSection tenantId={tenant.id} negocio={nombre} enfocar={enfocarOpciones} />
                <AvisosPorCanalSection tenantId={tenant.id} negocio={nombre} />
              </>
            )}
            <AliadosSection tenantId={tenant.id} />
          </Seccion>

          <Seccion titulo="Asistente">
            <AgentOSSection tenantId={tenant.id} />
          </Seccion>
        </div>
      </SheetContent>
      <EliminarNegocio tenant={tenant} abierto={eliminar} onAbierto={setEliminar} />
    </Sheet>
  );
}
