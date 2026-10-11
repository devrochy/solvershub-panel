"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Check, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";

type Gasto = { id: string; descripcion: string; valor: number; aprobado: boolean };

/** Alta y edición de gastos de la cartera (el aprobado no se edita: descuadraría la caja). */
export function ExpenseFormDialog({
  portfolioId,
  expense,
  trigger,
}: {
  portfolioId: string;
  expense?: Gasto;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});
  const editando = Boolean(expense);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus({ loading: true });
    const res = await fetch(
      editando ? `/api/pack/cobranza/expenses/${expense?.id}` : "/api/pack/cobranza/expenses",
      {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editando ? {} : { cartera_id: portfolioId }),
          descripcion: String(data.get("descripcion") ?? ""),
          valor: Number(data.get("valor") ?? 0),
        }),
      },
    );
    setStatus({ loading: false });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ error: json.error ?? "No se pudo guardar el gasto." });
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        title={editando ? "Editar gasto" : "Registrar gasto"}
        description="El gasto nace sin aprobar; al aprobarlo se descuenta de la caja."
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Descripción" htmlFor="descripcion">
            <Input id="descripcion" name="descripcion" defaultValue={expense?.descripcion} required />
          </Field>
          <Field label="Valor" htmlFor="valor">
            <Input
              id="valor"
              name="valor"
              type="number"
              min={1}
              step="0.01"
              defaultValue={expense?.valor}
              required
            />
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={status.loading}>
              {status.loading ? "Guardando…" : editando ? "Guardar cambios" : "Registrar gasto"}
            </Button>
            <FormFeedback error={status.error} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Editar (si no está aprobado) y aprobar el gasto (descuenta de la caja una vez). */
export function ExpenseRowActions({
  portfolioId,
  expense,
}: {
  portfolioId: string;
  expense: Gasto;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  if (expense.aprobado) {
    return <span className="text-xs text-body">—</span>;
  }

  async function aprobar() {
    setLoading(true);
    setError(undefined);
    const res = await fetch(`/api/pack/cobranza/expenses/${expense.id}/approve`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "No se pudo aprobar el gasto.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <ExpenseFormDialog
        expense={expense}
        portfolioId={portfolioId}
        trigger={
          <Button aria-label="Editar" size="icon" title="Editar" variant="outline">
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
        }
      />
      {confirmando ? (
        <>
          <Button
            aria-label="Confirmar aprobación"
            className="text-status-danger-fg"
            disabled={loading}
            onClick={aprobar}
            size="icon"
            title="Confirmar aprobación"
            variant="outline"
          >
            <Check className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            aria-label="Cancelar"
            onClick={() => setConfirmando(false)}
            size="icon"
            title="Cancelar"
            variant="ghost"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </>
      ) : (
        <Button
          aria-label="Aprobar gasto"
          onClick={() => setConfirmando(true)}
          size="icon"
          title="Aprobar gasto"
          variant="outline"
        >
          <Check className="h-4 w-4" aria-hidden />
        </Button>
      )}
      {error && (
        <span className="text-xs text-status-danger-fg" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
