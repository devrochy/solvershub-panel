"use client";

import { useState, type FormEvent } from "react";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { PlanResponse, PlatformTenant } from "@/lib/api/types";
import { estadoDelPlan } from "@/lib/estados-negocio";
import { formatCop } from "@/lib/format";
import { useAction } from "@/lib/use-action";

/** Badge del plan: muestra el estado de la suscripción y abre el cambio de plan. */
export function TenantPlanBadge({
  tenant,
  plans,
}: {
  tenant: PlatformTenant;
  plans: PlanResponse["plans"];
}) {
  const [open, setOpen] = useState(false);
  const { run, pending } = useAction();
  const estado = estadoDelPlan(tenant);
  const nombre = tenant.name || tenant.slug;
  const planActual = plans.find((plan) => plan.name === tenant.plan_name)?.id ?? plans[0]?.id ?? "";
  const [planId, setPlanId] = useState(planActual);
  const [dias, setDias] = useState("0");

  function abrir(next: boolean) {
    setOpen(next);
    if (next) {
      setPlanId(planActual);
      setDias("0");
    }
  }

  async function aplicar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!planId) return;
    const extendDias = Math.max(0, Math.trunc(Number(dias) || 0));
    const ok = await run(async () => {
      const res = await fetch(`/api/platform/tenants/${tenant.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "plan", plan_id: planId, extend_days: extendDias }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return { ok: false, status: res.status, error: json.error ?? "No se pudo cambiar el plan." };
      return { ok: true, success: "Plan actualizado." };
    });
    if (ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={abrir}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Cambiar plan de ${nombre}: ${estado.label}`}
          className="group -mx-1 inline-flex min-h-8 items-center gap-1.5 rounded-md px-1 transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Badge variant={estado.variant}>{estado.label}</Badge>
          <ChevronDown
            className="h-3.5 w-3.5 text-text-soft transition-colors group-hover:text-headline"
            aria-hidden
          />
        </button>
      </DialogTrigger>
      <DialogContent
        title="Cambiar plan"
        description={`${nombre} · ${tenant.slug}`}
        className="max-w-lg"
      >
        <form onSubmit={aplicar} className="flex flex-col gap-4">
          <p className="text-sm text-body">
            Plan actual: <span className="text-headline">{estado.label}</span>
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Plan" htmlFor={`plan-${tenant.id}`}>
              <Select
                id={`plan-${tenant.id}`}
                name="plan_id"
                value={planId}
                onChange={(event) => setPlanId(event.target.value)}
                disabled={plans.length === 0 || pending}
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} · {plan.is_free ? "Gratis" : `${formatCop(plan.price_cop)}/mes`}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Días extra" htmlFor={`ext-${tenant.id}`} help="0 = sin extensión.">
              <Input
                id={`ext-${tenant.id}`}
                name="extend_days"
                type="number"
                min={0}
                value={dias}
                onChange={(event) => setDias(event.target.value)}
                disabled={pending}
              />
            </Field>
          </div>

          <p className="text-xs text-text-soft">
            El cambio aplica de inmediato y activa la suscripción. Los días extra se suman al período actual.
          </p>

          {plans.length === 0 && (
            <p role="alert" className="text-xs text-status-danger-fg">
              No hay planes disponibles. Inténtalo de nuevo más tarde.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={pending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="accent" disabled={pending || !planId}>
              Aplicar plan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
