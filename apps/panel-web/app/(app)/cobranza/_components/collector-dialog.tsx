"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";

export type Collector = {
  id: string;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  codigo: string | null;
  estatus: string;
};

/**
 * Alta y edición de un gestor. El alta crea además su cuenta de acceso
 * (Admin + TenantUser en el core, ADR-0066): correo y contraseña son su login.
 */
export function CollectorFormDialog({
  collector,
  trigger,
}: {
  collector?: Collector;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});
  const editando = Boolean(collector);
  const [nombre = "", apellido = ""] = (collector?.nombre ?? "").split(" ");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus({ loading: true });
    const res = await fetch(
      editando ? `/api/pack/cobranza/collectors/${collector?.id}` : "/api/pack/cobranza/collectors",
      {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: String(data.get("nombre") ?? ""),
          apellido: String(data.get("apellido") ?? ""),
          correo: String(data.get("correo") ?? ""),
          telefono: String(data.get("telefono") ?? ""),
          codigo: String(data.get("codigo") ?? ""),
          password: String(data.get("password") ?? ""),
        }),
      },
    );
    setStatus({ loading: false });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ error: json.error ?? "No se pudo guardar el gestor." });
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        title={editando ? "Editar gestor" : "Nuevo gestor"}
        description={
          editando
            ? "Los datos de contacto del gestor. Su acceso se gestiona en Colaboradores."
            : "Se crea su cuenta de acceso con el correo y la contraseña (aparece en Colaboradores)."
        }
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="nombre">
              <Input id="nombre" name="nombre" defaultValue={nombre} required />
            </Field>
            <Field label="Apellido" htmlFor="apellido">
              <Input id="apellido" name="apellido" defaultValue={editando ? apellido : ""} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Correo" htmlFor="correo">
              <Input id="correo" name="correo" type="email" defaultValue={collector?.correo ?? ""} />
            </Field>
            <Field label="Teléfono" htmlFor="telefono">
              <Input id="telefono" name="telefono" defaultValue={collector?.telefono ?? ""} />
            </Field>
          </div>
          <Field label="Código interno" htmlFor="codigo">
            <Input id="codigo" name="codigo" defaultValue={collector?.codigo ?? ""} />
          </Field>
          {!editando && (
            <Field label="Contraseña" htmlFor="password" help="Mínimo 8 caracteres.">
              <Input id="password" name="password" type="password" minLength={8} required />
            </Field>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={status.loading}>
              {status.loading ? "Guardando…" : editando ? "Guardar cambios" : "Crear gestor"}
            </Button>
            <FormFeedback error={status.error} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Acciones por fila: editar y eliminar (con confirmación en dos pasos). */
export function CollectorRowActions({ collector }: { collector: Collector }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function eliminar() {
    setLoading(true);
    setError(undefined);
    const res = await fetch(`/api/pack/cobranza/collectors/${collector.id}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "No se pudo eliminar el gestor.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <CollectorFormDialog
        collector={collector}
        trigger={
          <Button size="sm" variant="ghost">
            Editar
          </Button>
        }
      />
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
