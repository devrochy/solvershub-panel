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
                  className="text-danger"
                  disabled={status.loading}
                  onClick={eliminar}
                  type="button"
                  variant="outline"
                >
                  {status.loading ? "…" : "Confirmar eliminación"}
                </Button>
                <Button onClick={() => setConfirmando(false)} type="button" variant="ghost">
                  Cancelar
                </Button>
              </>
            ) : (
              <Button onClick={() => setConfirmando(true)} type="button" variant="ghost">
                Eliminar cuota
              </Button>
            )}
          </div>
          <FormFeedback error={status.error} />
        </form>
      </DialogContent>
    </Dialog>
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
            className="text-danger"
            disabled={loading}
            onClick={eliminar}
            size="sm"
            variant="outline"
          >
            {loading ? "…" : "Confirmar"}
          </Button>
          <Button onClick={() => setConfirmando(false)} size="sm" variant="ghost">
            Cancelar
          </Button>
        </>
      ) : (
        <Button onClick={() => setConfirmando(true)} size="sm" variant="ghost">
          Eliminar
        </Button>
      )}
      {error && (
        <span className="text-xs text-danger" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
