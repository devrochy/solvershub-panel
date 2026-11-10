"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Pencil, Trash2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { MenuDeFila } from "@/components/domain/menu-de-fila";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
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
  abierto,
  onAbiertoChange,
}: {
  collector?: Collector;
  trigger?: ReactNode;
  /** Controlado: el diálogo se abre desde un menú, sin disparador propio. */
  abierto?: boolean;
  onAbiertoChange?: (abierto: boolean) => void;
}) {
  const router = useRouter();
  const [abiertoPropio, setAbiertoPropio] = useState(false);
  const open = abierto ?? abiertoPropio;
  const setOpen = onAbiertoChange ?? setAbiertoPropio;
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
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
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

/** Acciones por fila: permisos, editar y eliminar con confirmación. */
export function CollectorRowActions({ collector }: { collector: Collector }) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [editando, setEditando] = useState(false);
  const [permisos, setPermisos] = useState(false);
  const [error, setError] = useState<string>();

  async function eliminar() {
    const ok = await confirmar({
      title: `¿Eliminar a ${collector.nombre}?`,
      description: "Deja de ser gestor del negocio y pierde el acceso a la app de campo.",
      confirmLabel: "Eliminar gestor",
      destructive: true,
    });
    if (!ok) return;
    setError(undefined);
    const res = await fetch(`/api/pack/cobranza/collectors/${collector.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "No se pudo eliminar el gestor.");
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
      <MenuDeFila etiqueta={`Más acciones de ${collector.nombre}`}>
        <DropdownMenuItem icon={<ShieldCheck />} onSelect={() => setPermisos(true)}>
          Permisos
        </DropdownMenuItem>
        <DropdownMenuItem icon={<Pencil />} onSelect={() => setEditando(true)}>
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem icon={<Trash2 />} tone="danger" onSelect={() => void eliminar()}>
          Eliminar
        </DropdownMenuItem>
      </MenuDeFila>
      <CollectorPermissionsDialog collectorId={collector.id} nombre={collector.nombre} abierto={permisos} onAbiertoChange={setPermisos} />
      <CollectorFormDialog collector={collector} abierto={editando} onAbiertoChange={setEditando} />
    </div>
  );
}
