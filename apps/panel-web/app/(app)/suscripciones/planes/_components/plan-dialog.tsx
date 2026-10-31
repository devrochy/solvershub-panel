"use client";

import { useState, type FormEvent } from "react";
import { Pencil, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { MinimoPagoEnLineaOut, PlanOut } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import {
  PERIODICIDADES_DE_PLAN,
  avisoDeMinimo,
  cuerpoDePlan,
  formularioDePlan,
  permiteProbar,
  type PlanFormulario,
} from "@/lib/planes";
import { periodicidadLabel } from "@/lib/suscripciones-admin";

/**
 * Alta y edición de un plan del catálogo de Suscripciones (HU-SUB-31). Guardar un plan bajo el mínimo
 * de la pasarela avisa pero no bloquea: ese cobro se hará por transferencia. Editar no toca lo ya
 * vendido: las suscripciones inscritas conservan su precio.
 */
export function PlanDialog({
  plan,
  minimo = null,
  moneda = "COP",
}: {
  plan?: PlanOut;
  /** Mínimo del pago en línea según el servidor; `null` = no se pudo saber, sin aviso. */
  minimo?: Pick<MinimoPagoEnLineaOut, "minimo" | "cuentas_de_transferencia"> | null;
  moneda?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PlanFormulario>(() => formularioDePlan(plan));
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});
  const monedaDelPlan = plan?.moneda ?? moneda;
  const puedeProbar = permiteProbar(form.precio);
  const aviso = avisoDeMinimo({ precio: Number(form.precio), periodo: form.periodicidad }, minimo, monedaDelPlan);

  function cambiar<K extends keyof PlanFormulario>(campo: K, valor: PlanFormulario[K]) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const r = cuerpoDePlan(puedeProbar ? form : { ...form, trial_dias: "0" }, plan ?? null, moneda);
    if ("error" in r) {
      setStatus({ error: r.error });
      return;
    }
    setStatus({ loading: true });
    const res = await fetch(plan ? `/api/pack/pack_subscriptions/planes/${plan.id}` : "/api/pack/pack_subscriptions/planes", {
      method: plan ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(r.cuerpo),
    }).catch(() => null);
    if (!res) {
      setStatus({ error: "No se pudo contactar el servidor." });
      return;
    }
    const json = (await res.json().catch(() => ({}))) as { error?: unknown };
    if (!res.ok) {
      setStatus({ error: typeof json.error === "string" && json.error ? json.error : "No se pudo guardar el plan." });
      return;
    }
    setStatus({});
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        if (abierto) {
          setForm(formularioDePlan(plan));
          setStatus({});
        }
        setOpen(abierto);
      }}
    >
      <DialogTrigger asChild>
        {plan ? (
          <Button aria-label={`Editar ${plan.nombre}`} size="icon" title="Editar" variant="outline">
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
        ) : (
          <Button variant="accent">Nuevo plan</Button>
        )}
      </DialogTrigger>
      <DialogContent
        title={plan ? "Editar plan" : "Nuevo plan"}
        description={
          plan
            ? "Los cambios aplican a quienes se inscriban desde ahora: las suscripciones que ya existen conservan su precio."
            : "Lo que el agente ofrece y cobra: nombre, precio y cada cuánto se paga."
        }
        className="max-w-xl"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="plan-nombre" required>
              <Input id="plan-nombre" value={form.nombre} onChange={(e) => cambiar("nombre", e.target.value)} maxLength={120} required />
            </Field>
            <Field label="Código" htmlFor="plan-codigo" help="Identifica el plan; no se repite en tu negocio." required>
              <Input id="plan-codigo" value={form.codigo} onChange={(e) => cambiar("codigo", e.target.value)} maxLength={40} required />
            </Field>
          </div>
          <Field label="Descripción" htmlFor="plan-descripcion">
            <Input id="plan-descripcion" value={form.descripcion} onChange={(e) => cambiar("descripcion", e.target.value)} maxLength={2000} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={`Precio (${monedaDelPlan})`} htmlFor="plan-precio" help="$0 = plan gratis.">
              <Input
                id="plan-precio"
                type="number"
                step="0.01"
                min={0}
                value={form.precio}
                onChange={(e) => cambiar("precio", e.target.value)}
              />
            </Field>
            <Field label="Periodicidad" htmlFor="plan-periodicidad">
              <Select id="plan-periodicidad" value={form.periodicidad} onChange={(e) => cambiar("periodicidad", e.target.value)}>
                {PERIODICIDADES_DE_PLAN.map((p) => (
                  <option key={p} value={p}>
                    {periodicidadLabel(p)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Días de prueba"
              htmlFor="plan-prueba"
              help={puedeProbar ? undefined : "Solo un plan de $0 tiene prueba."}
            >
              <Input
                id="plan-prueba"
                type="number"
                min={0}
                max={365}
                value={puedeProbar ? form.trial_dias : "0"}
                onChange={(e) => cambiar("trial_dias", e.target.value)}
                disabled={!puedeProbar}
              />
            </Field>
          </div>
          <Checkbox
            id="plan-activo"
            label="Ofrecer este plan a los clientes nuevos"
            checked={form.activo}
            onCheckedChange={(v) => cambiar("activo", v)}
          />

          {aviso && (
            <div role="status" className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-body">
              <p className="font-medium text-headline">Este plan no podrá cobrarse con link de pago</p>
              <p className="mt-1">{aviso.mensaje}</p>
              {aviso.sinCuentas && (
                <p className="mt-1">
                  Todavía no configuraste cuentas de transferencia: sin ellas el cliente no sabría cómo pagar.{" "}
                  <Link href="/habilidades/pack_commerce" className="font-medium underline underline-offset-2">
                    Configurarlas
                  </Link>
                </p>
              )}
              {aviso.alternativas.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span>Con una periodicidad más larga sí llega al mínimo:</span>
                  {aviso.alternativas.map((a) => (
                    <Button
                      key={a.value}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setForm((actual) => ({ ...actual, periodicidad: a.value, precio: String(a.precio) }))}
                    >
                      {a.label} a {formatMoney(a.precio, monedaDelPlan)}
                    </Button>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-text-soft">Puedes guardarlo igual: ese cobro se hará por transferencia.</p>
            </div>
          )}

          <FormFeedback error={status.error} />

          <div className="mt-2 flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" aria-label="Cancelar" size="icon" title="Cancelar" variant="outline">
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </DialogClose>
            <Button type="submit" variant="accent" disabled={status.loading}>
              {status.loading ? "Guardando…" : "Guardar plan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

