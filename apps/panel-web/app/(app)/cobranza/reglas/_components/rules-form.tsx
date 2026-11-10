"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { InputNumero } from "@/components/ui/input-numero";
import { formatCop } from "@/lib/format";

type Rules = {
  max_dias_prorroga: number;
  min_abono_pct: number;
  max_reprogramaciones: number;
  umbral_saldo_autonomo: number;
};

/** Los límites que el agente respeta al negociar. Cada campo se acota mientras se escribe. */
export function RulesForm({ rules }: { rules: Rules }) {
  const router = useRouter();
  const [valores, setValores] = useState({
    max_dias_prorroga: rules.max_dias_prorroga,
    min_abono_pct: rules.min_abono_pct,
    max_reprogramaciones: rules.max_reprogramaciones,
    umbral_saldo_autonomo: rules.umbral_saldo_autonomo,
  });
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});
  const cambiar = (campo: keyof Rules) => (valor: number) => setValores((previo) => ({ ...previo, [campo]: valor }));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ loading: true });
    const res = await fetch("/api/pack/cobranza/rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valores),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudieron guardar las reglas." });
      return;
    }
    setStatus({ success: "Reglas guardadas." });
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Días máximos de prórroga" htmlFor="max_dias_prorroga" help="Hasta cuántos días puede correr una fecha de pago.">
              <InputNumero id="max_dias_prorroga" min={0} value={valores.max_dias_prorroga} onValueChange={cambiar("max_dias_prorroga")} />
            </Field>
            <Field label="Abono mínimo (%)" htmlFor="min_abono_pct" help="Parte de la cuota que debe pagar como mínimo.">
              <InputNumero id="min_abono_pct" min={0} max={100} step={0.5} decimal value={valores.min_abono_pct} onValueChange={cambiar("min_abono_pct")} />
            </Field>
            <Field label="Reprogramaciones máximas" htmlFor="max_reprogramaciones" help="Cuántas veces se puede reprogramar un mismo pago.">
              <InputNumero id="max_reprogramaciones" min={0} value={valores.max_reprogramaciones} onValueChange={cambiar("max_reprogramaciones")} />
            </Field>
            <Field
              label="Saldo máximo para negociar solo"
              htmlFor="umbral_saldo_autonomo"
              help={
                valores.umbral_saldo_autonomo > 0
                  ? `El agente negocia solo si el saldo es menor a ${formatCop(valores.umbral_saldo_autonomo)}.`
                  : "Con 0 no hay tope: el agente negocia cualquier saldo."
              }
            >
              <InputNumero id="umbral_saldo_autonomo" min={0} step={10000} value={valores.umbral_saldo_autonomo} onValueChange={cambiar("umbral_saldo_autonomo")} />
            </Field>
          </div>

          <FormFeedback error={status.error} success={status.success} />

          <div>
            <Button type="submit" variant="accent" disabled={status.loading}>
              {status.loading ? "Guardando…" : "Guardar reglas"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
