"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";

/** Genera (o actualiza) el cobro de un período al propietario. */
export function ChargeForm() {
  const router = useRouter();
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus({ loading: true });
    const res = await fetch("/api/pack/cobranza/owner-charges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodo: String(data.get("periodo") ?? ""),
        monto: Number(data.get("monto") ?? 0),
        fecha_vencimiento: String(data.get("fecha_vencimiento") ?? ""),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo generar el cobro." });
      return;
    }
    form.reset();
    setStatus({ success: "Cobro generado y propietario notificado." });
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Periodo" htmlFor="periodo" help="Formato AAAA-MM">
              <Input id="periodo" name="periodo" placeholder="2026-10" required />
            </Field>
            <Field label="Monto" htmlFor="monto">
              <Input id="monto" name="monto" type="number" min={1} step="0.01" required />
            </Field>
            <Field label="Vence" htmlFor="fecha_vencimiento">
              <Input id="fecha_vencimiento" name="fecha_vencimiento" type="date" required />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={status.loading}>
              {status.loading ? "Generando…" : "Generar cobro"}
            </Button>
            <FormFeedback error={status.error} success={status.success} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
