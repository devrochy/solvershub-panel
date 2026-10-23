"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/confirm";
import { Separator } from "@/components/ui/separator";
import { JsonSchemaForm } from "@/components/domain/json-schema-form";
import { toast } from "@/lib/toast-store";
import { useAction } from "@/lib/use-action";

import { EliminarCuentaDialog } from "./eliminar-cuenta-dialog";
import { VerCredencialesDialog } from "./ver-credenciales-dialog";

/** Acciones de una conexión: ver datos, activar/desactivar, principal y eliminar. */
export function ConnectionActions({
  connectionId,
  label,
  active,
  primary,
  kind = "channel_connection",
  typeId,
  manual = false,
  trigger = "icon",
  triggerLabel = "Gestionar",
}: {
  connectionId: string;
  label: string;
  active: boolean;
  primary: boolean;
  kind?: "channel_connection" | "meta_connection";
  typeId?: string | null;
  /** La conexión se configura con formulario manual (correo, etc.). */
  manual?: boolean;
  /** `button` se usa en la tarjeta de la consola; `icon` en tablas y listas densas. */
  trigger?: "icon" | "button";
  triggerLabel?: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { run, pending } = useAction();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [datosOpen, setDatosOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState<
    | { schema: Record<string, unknown>; values: Record<string, unknown>; configured_secrets: string[] }
    | null
  >(null);

  async function openEdit() {
    if (!typeId) return;
    setEditOpen(true);
    setForm(null);
    const res = await fetch(
      `/api/connections/manual/${encodeURIComponent(typeId)}?connectionId=${connectionId}`,
    );
    const json = (await res.json().catch(() => null)) as
      | { schema: Record<string, unknown>; values: Record<string, unknown>; configured_secrets: string[]; error?: string }
      | null;
    if (!res.ok || !json?.schema) {
      toast.error(json?.error ?? "No se pudo cargar la conexión.");
      setEditOpen(false);
      return;
    }
    setForm(json);
  }

  async function post(action: "activate" | "deactivate" | "primary") {
    const res = await fetch(`/api/connections/${connectionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, kind }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: res.ok, error: json.error };
  }

  async function runAccion(action: "activate" | "deactivate" | "primary") {
    if (action === "deactivate") {
      const aceptado = await confirm({
        title: "Desactivar conexión",
        description:
          "El negocio dejará de recibir mensajes por esta conexión hasta que la vuelvas a activar.",
        confirmLabel: "Desactivar",
        destructive: true,
      });
      if (!aceptado) return;
    }
    await run(post.bind(null, action));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger === "button" ? (
          <Button variant="outline" size="sm">
            {triggerLabel}
          </Button>
        ) : (
          <IconAction label={`Acciones de ${label}`} tone="neutro">
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </IconAction>
        )}
      </DialogTrigger>
      <DialogContent title="Acciones de la conexión" description={label} className="max-w-md">
        <div className="flex flex-col gap-4">
          {manual && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOpen(false);
                setDatosOpen(true);
              }}
            >
              Ver datos
            </Button>
          )}
          {manual && typeId && (
            <Button variant="outline" size="sm" onClick={() => void openEdit()}>
              Editar credenciales
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void runAccion(active ? "deactivate" : "activate")}
            disabled={pending}
          >
            {active ? "Desactivar" : "Activar"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void runAccion("primary")}
            disabled={pending || primary || kind === "meta_connection"}
          >
            {kind === "meta_connection"
              ? "Principal (solo canales manuales)"
              : primary
                ? "Ya es la principal"
                : "Marcar como principal"}
          </Button>

          <Separator />

          <p className="text-sm text-status-danger-fg">
            Eliminar la cuenta archiva la conexión y revoca sus tokens.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setOpen(false);
              setDeleteOpen(true);
            }}
            disabled={pending}
          >
            Eliminar cuenta
          </Button>

          <div className="flex justify-end">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Cerrar
              </Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title="Editar credenciales" description={label} className="max-w-xl">
          {form ? (
            <JsonSchemaForm
              resourcePath="/api/connections/manual"
              method="POST"
              extraBody={{ type_id: typeId, label, connection_id: connectionId }}
              schema={form.schema}
              initialValues={form.values}
              configuredSecrets={form.configured_secrets}
              submitLabel="Guardar cambios"
              onSaved={() => {
                setEditOpen(false);
                router.refresh();
              }}
            />
          ) : (
            <p className="text-sm text-text-soft">Cargando…</p>
          )}
        </DialogContent>
      </Dialog>

      <VerCredencialesDialog
        connectionId={connectionId}
        label={label}
        open={datosOpen}
        onOpenChange={setDatosOpen}
      />
      <EliminarCuentaDialog
        connectionId={connectionId}
        label={label}
        kind={kind}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </Dialog>
  );
}
