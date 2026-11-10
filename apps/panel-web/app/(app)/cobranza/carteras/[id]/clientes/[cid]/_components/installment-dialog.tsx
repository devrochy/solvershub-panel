"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCop, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Cuota = { id: string; numero: number; valor: number; vence: string; estatus: string };

const ESTATUS: Record<string, string> = {
  pendiente: "Pendiente",
  pagada: "Pagada",
  atrasada: "Atrasada",
  parcial: "Parcial",
};

/** Edición y borrado de una cuota del plan (paridad con el clásico). */
export function InstallmentEditor({
  installment,
  trigger,
}: {
  installment: Cuota;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus({ loading: true });
    const res = await fetch(`/api/pack/cobranza/installments/${installment.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        valor: Number(data.get("valor") ?? 0),
        vence: String(data.get("vence") ?? ""),
        estatus: String(data.get("estatus") ?? "pendiente"),
      }),
    });
    setStatus({ loading: false });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ error: json.error ?? "No se pudo guardar la cuota." });
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function eliminar() {
    setStatus({ loading: true });
    const res = await fetch(`/api/pack/cobranza/installments/${installment.id}`, {
      method: "DELETE",
    });
    setStatus({ loading: false });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ error: json.error ?? "No se pudo eliminar la cuota." });
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        title={`Cuota #${installment.numero}`}
        description="Ajusta el valor, el vencimiento o el estado; también puedes eliminarla del plan."
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor" htmlFor="valor">
              <Input
                id="valor"
                name="valor"
                type="number"
                min={1}
                step="0.01"
                defaultValue={installment.valor}
                required
              />
            </Field>
            <Field label="Vence" htmlFor="vence">
              <Input id="vence" name="vence" type="date" defaultValue={installment.vence} required />
            </Field>
          </div>
          <Field label="Estado" htmlFor="estatus">
            <Select id="estatus" name="estatus" defaultValue={installment.estatus}>
              {Object.entries(ESTATUS).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={status.loading}>
              {status.loading ? "Guardando…" : "Guardar cuota"}
            </Button>
            {confirmando ? (
              <>
                <Button
                  className="text-status-danger-fg"
                  disabled={status.loading}
                  onClick={eliminar}
                  type="button"
                  variant="outline"
                >
                  {status.loading ? "…" : "Confirmar eliminación"}
                </Button>
                <Button onClick={() => setConfirmando(false)} type="button" aria-label="Cancelar" size="icon" title="Cancelar" variant="outline"><X className="h-4 w-4" aria-hidden /></Button>
              </>
            ) : (
              <Button
                aria-label="Eliminar cuota"
                onClick={() => setConfirmando(true)}
                size="icon"
                title="Eliminar cuota"
                type="button"
                variant="ghost"
              >
                <Trash2 className="h-4 w-4 text-status-danger-fg" aria-hidden />
              </Button>
            )}
          </div>
          <FormFeedback error={status.error} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Una cuota del plan: su estado va en texto y en color, y al tocarla se edita. */
export function CuotaDelPlan({ cuota }: { cuota: Cuota }) {
  const pagada = cuota.estatus === "pagada";
  const atrasada = cuota.estatus === "atrasada";
  return (
    <InstallmentEditor
      installment={cuota}
      trigger={
        <button
          type="button"
          aria-label={`Cuota ${cuota.numero}: ${formatCop(cuota.valor)}, ${ESTATUS[cuota.estatus] ?? cuota.estatus}, vence ${formatDate(cuota.vence)}`}
          className={cn(
            "flex min-h-15 flex-col gap-0.5 rounded-md border px-2.5 py-2 text-left text-xs text-body transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-focus",
            pagada && "border-status-success-border bg-status-success-bg",
            atrasada && "border-status-danger-border bg-status-danger-bg",
            !pagada && !atrasada && "border-border-soft",
          )}
        >
          <span>Cuota {cuota.numero}</span>
          <span className="text-sm font-semibold tabular-nums text-headline">{formatCop(cuota.valor)}</span>
          <span>{pagada || atrasada || cuota.estatus === "parcial" ? ESTATUS[cuota.estatus] : formatDate(cuota.vence)}</span>
        </button>
      }
    />
  );
}

/** Borrado de un abono (los pagos no se borran desde la ficha). */
export function CreditDelete({ creditId }: { creditId: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function eliminar() {
    setLoading(true);
    setError(undefined);
    const res = await fetch(`/api/pack/cobranza/credits/${creditId}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "No se pudo eliminar el abono.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {confirmando ? (
        <>
          <Button
            className="text-status-danger-fg"
            disabled={loading}
            onClick={eliminar}
            size="sm"
            variant="outline"
          >
            {loading ? "…" : "Confirmar"}
          </Button>
          <Button onClick={() => setConfirmando(false)} aria-label="Cancelar" size="icon" title="Cancelar" variant="outline"><X className="h-4 w-4" aria-hidden /></Button>
        </>
      ) : (
        <Button onClick={() => setConfirmando(true)} aria-label="Eliminar abono" size="icon" title="Eliminar abono" variant="ghost" className="pointer-coarse:h-11 pointer-coarse:w-11"><Trash2 className="h-4 w-4 text-status-danger-fg" aria-hidden /></Button>
      )}
      {error && (
        <span className="text-xs text-status-danger-fg" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
