"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Cuota = { id: string; numero: number; valor: number; vence: string; estatus: string };

const METODOS = ["efectivo", "transferencia", "nequi", "daviplata", "otro"];

/** Alta de préstamo: valor, interés, cuotas, días entre cuotas y fecha. */
export function LoanFormDialog({
  clientId,
  trigger,
}: {
  clientId: string;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus({ loading: true });
    const res = await fetch(`/api/pack/cobranza/clients/${clientId}/loans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        valor: Number(data.get("valor") ?? 0),
        num_cuotas: Number(data.get("num_cuotas") ?? 1),
        tipo_interes: Number(data.get("tipo_interes") ?? 0),
        dias_entre_cuotas: Number(data.get("dias_entre_cuotas") ?? 1),
        fecha_otorgado: String(data.get("fecha_otorgado") ?? "") || null,
      }),
    });
    setStatus({ loading: false });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ error: json.error ?? "No se pudo crear el préstamo." });
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        title="Nuevo préstamo"
        description="Genera el plan de cuotas y descuenta el desembolso de la caja de la cartera."
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor prestado" htmlFor="valor">
              <Input id="valor" name="valor" type="number" min={1} step="0.01" required />
            </Field>
            <Field label="Interés (%)" htmlFor="tipo_interes">
              <Input id="tipo_interes" name="tipo_interes" type="number" min={0} step="0.01" defaultValue={0} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Cuotas" htmlFor="num_cuotas">
              <Input id="num_cuotas" name="num_cuotas" type="number" min={1} defaultValue={4} />
            </Field>
            <Field label="Días entre cuotas" htmlFor="dias_entre_cuotas">
              <Input id="dias_entre_cuotas" name="dias_entre_cuotas" type="number" min={1} defaultValue={7} />
            </Field>
            <Field label="Fecha otorgado" htmlFor="fecha_otorgado">
              <Input id="fecha_otorgado" name="fecha_otorgado" type="date" />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={status.loading}>
              {status.loading ? "Creando…" : "Crear préstamo"}
            </Button>
            <FormFeedback error={status.error} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

async function enviarMovimiento(
  url: string,
  payload: Record<string, unknown>,
): Promise<string | undefined> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    return json.error ?? "No se pudo registrar el movimiento.";
  }
  return undefined;
}

/** Pago de una cuota (marca la cuota) o abono libre al préstamo. */
export function MovementDialog({
  loanId,
  cuotas,
  tipo,
  trigger,
}: {
  loanId: string;
  cuotas: Cuota[];
  tipo: "pago" | "abono";
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});
  const pendientes = cuotas.filter((c) => c.estatus !== "pagada");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus({ loading: true });
    const valor = Number(data.get("valor") ?? 0);
    const metodo = String(data.get("metodo_pago") ?? "efectivo");
    const error = await enviarMovimiento(
      tipo === "pago"
        ? `/api/pack/cobranza/loans/${loanId}/payments`
        : `/api/pack/cobranza/loans/${loanId}/credits`,
      tipo === "pago"
        ? { valor, metodo_pago: metodo, cuota_id: String(data.get("cuota_id") ?? "") || null }
        : { valor, metodo_pago: metodo },
    );
    setStatus({ loading: false, error });
    if (error) return;
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        title={tipo === "pago" ? "Registrar pago" : "Registrar abono"}
        description={
          tipo === "pago"
            ? "El pago puede asociarse a una cuota (queda marcada como pagada) y suma a la caja."
            : "Abono al saldo del préstamo sin marcar cuota; suma a la caja."
        }
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Valor" htmlFor="valor">
            <Input id="valor" name="valor" type="number" min={1} step="0.01" required />
          </Field>
          {tipo === "pago" && (
            <Field label="Cuota" htmlFor="cuota_id" help="Opcional: solo si el pago salda una cuota.">
              <Select id="cuota_id" name="cuota_id" defaultValue="">
                <option value="">Sin cuota</option>
                {pendientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Cuota {c.numero} · {c.vence} · {c.valor}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Método" htmlFor="metodo_pago">
            <Select id="metodo_pago" name="metodo_pago" defaultValue="efectivo">
              {METODOS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={status.loading}>
              {status.loading ? "Registrando…" : tipo === "pago" ? "Registrar pago" : "Registrar abono"}
            </Button>
            <FormFeedback error={status.error} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
