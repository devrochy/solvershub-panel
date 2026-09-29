"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type Gestor = { id: string; nombre: string };

export type Cartera = {
  id: string;
  nombre: string;
  descripcion: string | null;
  gestor: string | null;
  gestor_id: string | null;
  tipo_interes: number;
  num_cuotas: number;
  moneda: string;
  estatus: string;
  costo_cobro: number;
};

/** Alta y edición de una cartera (mismos campos que el panel clásico). */
export function PortfolioFormDialog({
  gestores,
  cartera,
  trigger,
}: {
  gestores: Gestor[];
  cartera?: Cartera;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});
  const editando = Boolean(cartera);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus({ loading: true });
    const res = await fetch(
      editando ? `/api/pack/cobranza/portfolios/${cartera?.id}` : "/api/pack/cobranza/portfolios",
      {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: String(data.get("nombre") ?? ""),
          descripcion: String(data.get("descripcion") ?? ""),
          gestor_id: String(data.get("gestor_id") ?? "") || null,
          tipo_interes: Number(data.get("tipo_interes") ?? 0),
          num_cuotas: Number(data.get("num_cuotas") ?? 1),
          moneda: String(data.get("moneda") ?? "COP"),
          costo_cobro: Number(data.get("costo_cobro") ?? 0),
        }),
      },
    );
    setStatus({ loading: false });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ error: json.error ?? "No se pudo guardar la cartera." });
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        title={editando ? "Editar cartera" : "Nueva cartera"}
        description="El gestor y el interés se aplican a los préstamos que se creen en la cartera."
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Nombre" htmlFor="nombre">
            <Input id="nombre" name="nombre" defaultValue={cartera?.nombre} required />
          </Field>
          <Field label="Descripción" htmlFor="descripcion">
            <Input id="descripcion" name="descripcion" defaultValue={cartera?.descripcion ?? ""} />
          </Field>
          <Field label="Gestor" htmlFor="gestor_id">
            <Select id="gestor_id" name="gestor_id" defaultValue={cartera?.gestor_id ?? ""}>
              <option value="">Sin gestor</option>
              {gestores.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Interés (%)" htmlFor="tipo_interes">
              <Input
                id="tipo_interes"
                name="tipo_interes"
                type="number"
                step="0.01"
                min={0}
                defaultValue={cartera?.tipo_interes ?? 0}
              />
            </Field>
            <Field label="Cuotas" htmlFor="num_cuotas">
              <Input
                id="num_cuotas"
                name="num_cuotas"
                type="number"
                min={1}
                defaultValue={cartera?.num_cuotas ?? 12}
              />
            </Field>
            <Field label="Costo de cobro" htmlFor="costo_cobro">
              <Input
                id="costo_cobro"
                name="costo_cobro"
                type="number"
                step="0.01"
                min={0}
                defaultValue={cartera?.costo_cobro ?? 0}
              />
            </Field>
          </div>
          <Field label="Moneda" htmlFor="moneda">
            <Input id="moneda" name="moneda" defaultValue={cartera?.moneda ?? "COP"} />
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={status.loading}>
              {status.loading ? "Guardando…" : editando ? "Guardar cambios" : "Crear cartera"}
            </Button>
            <FormFeedback error={status.error} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Acciones por fila: editar y eliminar (con confirmación en dos pasos). */
export function PortfolioRowActions({
  cartera,
  gestores,
}: {
  cartera: Cartera;
  gestores: Gestor[];
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function eliminar() {
    setLoading(true);
    setError(undefined);
    const res = await fetch(`/api/pack/cobranza/portfolios/${cartera.id}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "No se pudo eliminar la cartera.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <PortfolioFormDialog
        cartera={cartera}
        gestores={gestores}
        trigger={
          <Button aria-label="Editar" size="icon" title="Editar" variant="outline">
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
        }
      />
      {confirmando ? (
        <>
          <Button
            aria-label="Confirmar eliminación"
            className="text-danger"
            disabled={loading}
            onClick={eliminar}
            size="icon"
            title="Confirmar eliminación"
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
          aria-label="Eliminar"
          onClick={() => setConfirmando(true)}
          size="icon"
          title="Eliminar"
          variant="ghost"
        >
          <Trash2 className="h-4 w-4 text-danger" aria-hidden />
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
