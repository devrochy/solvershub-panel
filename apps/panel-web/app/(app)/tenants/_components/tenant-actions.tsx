"use client";

import { useState, type FormEvent } from "react";
import { MoreHorizontal } from "lucide-react";

import { TENANT_STATUS } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { PlanResponse, PlatformTenant } from "@/lib/api/types";
import { AVISO_DESACTIVAR_PRIMERO, sePuedeEliminar } from "@/lib/eliminar-negocio";
import { useAction } from "@/lib/use-action";

/** Ciclo de vida y plan de un negocio (master). */
export function TenantActions({
  tenant,
  plans,
}: {
  tenant: PlatformTenant;
  plans: PlanResponse["plans"];
}) {
  const [open, setOpen] = useState(false);
  const { run: ejecutar, pending } = useAction();
  const activo = tenant.status === "active";
  const eliminable = sePuedeEliminar(tenant.status);

  const AVISOS: Record<string, string> = {
    activate: "Negocio activado.",
    deactivate: "Negocio desactivado.",
    plan: "Plan aplicado.",
    purge: "Negocio eliminado.",
  };

  async function run(action: string, payload: Record<string, unknown> = {}) {
    await ejecutar(async () => {
      const res = await fetch(`/api/platform/tenants/${tenant.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return { ok: false, status: res.status, error: json.error ?? "No se pudo completar la acción." };
      return { ok: true, success: AVISOS[action] ?? "Listo." };
    });
  }

  function onPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run("plan", {
      plan_id: String(data.get("plan_id") ?? ""),
      extend_days: Number(data.get("extend_days") ?? 0),
    });
  }

  function onPurge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run("purge", { confirm_phrase: String(data.get("confirm_phrase") ?? "") });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Acciones de ${tenant.slug}`}>
          <MoreHorizontal className="h-4 w-4" aria-hidden />
          Acciones
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Acciones del negocio"
        description={`${tenant.name || tenant.slug} · ${tenant.slug}`}
        className="max-w-xl"
      >
        <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pr-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-body">
              Estado:{" "}
              <span className="text-headline">{TENANT_STATUS[tenant.status]?.label ?? tenant.status}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void run(activo ? "deactivate" : "activate")}
              disabled={pending}
            >
              {activo ? "Desactivar" : "Activar"}
            </Button>
          </div>

          <Separator />

          <form onSubmit={onPlan} className="flex flex-col gap-3">
            <p className="text-sm font-medium text-headline">Cambiar plan</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Plan" htmlFor={`plan-${tenant.id}`}>
                <Select id={`plan-${tenant.id}`} name="plan_id" defaultValue={plans[0]?.id}>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Días extra" htmlFor={`ext-${tenant.id}`} help="0 = sin extensión.">
                <Input id={`ext-${tenant.id}`} name="extend_days" type="number" min={0} defaultValue={0} />
              </Field>
            </div>
            <div>
              <Button type="submit" variant="outline" size="sm" disabled={pending}>
                Aplicar plan
              </Button>
            </div>
          </form>

          <Separator />

          <form onSubmit={onPurge} className="flex flex-col gap-3">
            <p className="text-sm font-medium text-status-danger-fg">Eliminar negocio (irreversible)</p>
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
                disabled={!eliminable}
              />
            </Field>
            <div>
              <Button type="submit" variant="danger" size="sm" disabled={pending || !eliminable}>
                Eliminar definitivamente
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
