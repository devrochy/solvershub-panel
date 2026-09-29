"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/** Ajuste manual de la caja de la cartera (deja el saldo en el valor indicado). */
export function CashAdjustDialog({
  portfolioId,
  saldoActual,
  trigger,
}: {
  portfolioId: string;
  saldoActual: number;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus({ loading: true });
    const res = await fetch(`/api/pack/cobranza/portfolios/${portfolioId}/cash/adjustment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        valor_nuevo: Number(data.get("valor_nuevo") ?? 0),
        motivo: String(data.get("motivo") ?? ""),
      }),
    });
    setStatus({ loading: false });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ error: json.error ?? "No se pudo ajustar la caja." });
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        title="Ajustar caja"
        description="Deja el saldo de la caja en el valor real. Queda registrado con el motivo."
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Saldo actual" htmlFor="saldo_actual">
            <Input id="saldo_actual" value={saldoActual} readOnly disabled />
          </Field>
          <Field label="Saldo nuevo" htmlFor="valor_nuevo">
            <Input id="valor_nuevo" name="valor_nuevo" type="number" step="0.01" required />
          </Field>
          <Field label="Motivo" htmlFor="motivo">
            <Textarea id="motivo" name="motivo" rows={3} required placeholder="Ej.: conteo físico de caja" />
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={status.loading}>
              {status.loading ? "Ajustando…" : "Ajustar caja"}
            </Button>
            <FormFeedback error={status.error} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Acciones de jornada: cierre del día (snapshot) y apertura. */
export function CashDayActions({ portfolioId }: { portfolioId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ loading?: string; error?: string; success?: string }>({});

  async function run(action: "closing" | "opening") {
    setStatus({ loading: action });
    const res = await fetch(`/api/pack/cobranza/portfolios/${portfolioId}/cash/${action}`, {
      method: "POST",
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ error: json.error ?? "No se pudo completar la acción." });
      return;
    }
    setStatus({
      success: action === "closing" ? "Cierre del día generado." : "Apertura registrada.",
    });
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        disabled={Boolean(status.loading)}
        onClick={() => void run("closing")}
        size="sm"
        variant="outline"
      >
        {status.loading === "closing" ? "Cerrando…" : "Cerrar el día"}
      </Button>
      <Button
        disabled={Boolean(status.loading)}
        onClick={() => void run("opening")}
        size="sm"
        variant="outline"
      >
        {status.loading === "opening" ? "Registrando…" : "Registrar apertura"}
      </Button>
      <FormFeedback error={status.error} success={status.success} />
    </div>
  );
}

/** Aporte de capital a la cartera (suma a la caja). */
export function InjectionDialog({ portfolioId }: { portfolioId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus({ loading: true });
    const res = await fetch(`/api/pack/cobranza/portfolios/${portfolioId}/injections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        valor: Number(data.get("valor") ?? 0),
        comentario: String(data.get("comentario") ?? ""),
      }),
    });
    setStatus({ loading: false });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ error: json.error ?? "No se pudo registrar la inyección." });
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Registrar inyección
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Registrar inyección de capital"
        description="El aporte suma al saldo de la caja de la cartera y queda auditado."
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Valor" htmlFor="valor">
            <Input id="valor" name="valor" type="number" min={1} step="0.01" required />
          </Field>
          <Field label="Comentario" htmlFor="comentario">
            <Textarea id="comentario" name="comentario" rows={3} placeholder="Ej.: aporte del propietario" />
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={status.loading}>
              {status.loading ? "Registrando…" : "Registrar inyección"}
            </Button>
            <FormFeedback error={status.error} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
