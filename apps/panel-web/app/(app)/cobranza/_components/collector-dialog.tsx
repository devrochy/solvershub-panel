"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Pencil, Trash2, Check, X, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { InputPassword } from "@/components/ui/input-password";
import { CollectorPermissionsDialog } from "./collector-permissions-dialog";

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
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});
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
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      resultado?: string;
    };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo guardar el gestor." });
      return;
    }
    if (json.resultado === "invitado") {
      setStatus({
        success: "Ese correo ya tiene cuenta: se envió una invitación al gestor.",
      });
      router.refresh();
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
            : "Se crea su cuenta de acceso con el correo y la contraseña (aparece en Colaboradores). Si el correo ya existe, se le envía una invitación."
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
              <InputPassword id="password" name="password" minLength={8} required />
            </Field>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={status.loading}>
              {status.loading ? "Guardando…" : editando ? "Guardar cambios" : "Crear gestor"}
            </Button>
            <FormFeedback error={status.error} success={status.success} />
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
      <CollectorPermissionsDialog
        collectorId={collector.id}
        nombre={collector.nombre}
        trigger={
          <Button aria-label="Permisos" size="icon" title="Permisos" variant="outline">
            <ShieldCheck className="h-4 w-4" aria-hidden />
          </Button>
        }
      />
      <CollectorFormDialog
        collector={collector}
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
            className="text-status-danger-fg"
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
          <Trash2 className="h-4 w-4 text-status-danger-fg" aria-hidden />
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
