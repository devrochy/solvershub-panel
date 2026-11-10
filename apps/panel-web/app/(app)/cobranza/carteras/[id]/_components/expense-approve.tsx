"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
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

/** Acciones de un gasto sin aprobar: aprobarlo, con confirmación, y corregirlo. */
export function ExpenseRowActions({
  portfolioId,
  expense,
}: {
  portfolioId: string;
  expense: Gasto;
}) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  if (expense.aprobado) return null;

  async function aprobar() {
    const ok = await confirmar({
      title: "¿Aprobar este gasto?",
      description: `${expense.descripcion} se descuenta de la caja de la cartera.`,
      confirmLabel: "Aprobar gasto",
      destructive: false,
    });
    if (!ok) return;
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
      {error && (
        <span className="text-xs text-status-danger-fg" role="alert">
          {error}
        </span>
      )}
      <ExpenseFormDialog
        expense={expense}
        portfolioId={portfolioId}
        trigger={
          <Button aria-label={`Editar el gasto ${expense.descripcion}`} size="icon" title="Editar" variant="ghost" className="pointer-coarse:h-11 pointer-coarse:w-11">
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
        }
      />
      <Button size="sm" variant="outline" disabled={loading} onClick={() => void aprobar()} className="pointer-coarse:h-11">
        {loading ? "Aprobando…" : "Aprobar"}
      </Button>
    </div>
  );
}
