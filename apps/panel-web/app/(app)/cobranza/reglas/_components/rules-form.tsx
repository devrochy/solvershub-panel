"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";

type Rules = {
  max_dias_prorroga: number;
  min_abono_pct: number;
  max_reprogramaciones: number;
  umbral_saldo_autonomo: number;
};

/** Reglas deterministas de negociación del asistente. */
export function RulesForm({ rules }: { rules: Rules }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus({ loading: true });
    const res = await fetch("/api/pack/cobranza/rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        max_dias_prorroga: Number(data.get("max_dias_prorroga") ?? 15),
        min_abono_pct: Number(data.get("min_abono_pct") ?? 10),
        max_reprogramaciones: Number(data.get("max_reprogramaciones") ?? 2),
        umbral_saldo_autonomo: Number(data.get("umbral_saldo_autonomo") ?? 0),
      }),
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
            <Field label="Máx. días de prórroga" htmlFor="max_dias_prorroga">
              <Input id="max_dias_prorroga" name="max_dias_prorroga" type="number" min={0} defaultValue={rules.max_dias_prorroga} />
            </Field>
            <Field label="Abono mínimo (%)" htmlFor="min_abono_pct">
              <Input id="min_abono_pct" name="min_abono_pct" type="number" step="0.1" min={0} defaultValue={rules.min_abono_pct} />
            </Field>
            <Field label="Máx. reprogramaciones" htmlFor="max_reprogramaciones">
              <Input id="max_reprogramaciones" name="max_reprogramaciones" type="number" min={0} defaultValue={rules.max_reprogramaciones} />
            </Field>
            <Field
              label="Umbral de saldo autónomo"
              htmlFor="umbral_saldo_autonomo"
              help="Por debajo de este saldo el agente negocia solo. 0 = sin límite (negocia sin tope). Regla determinista: una fila por negocio."
            >
              <Input id="umbral_saldo_autonomo" name="umbral_saldo_autonomo" type="number" step="1" min={0} defaultValue={rules.umbral_saldo_autonomo} />
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
