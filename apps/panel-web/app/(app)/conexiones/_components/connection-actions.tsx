"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, KeyRound, Power, Star, Trash2 } from "lucide-react";

import { JsonSchemaForm } from "@/components/domain/json-schema-form";
import { MenuDeFila } from "@/components/domain/menu-de-fila";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast-store";
import { useAction } from "@/lib/use-action";

import { EliminarCuentaDialog } from "./eliminar-cuenta-dialog";
import { VerCredencialesDialog } from "./ver-credenciales-dialog";

/**
 * Menú de acciones de una conexión, en la cabecera de su ficha: ver y editar los datos de una
 * manual, activarla cuando no se pausa con el botón Pausar, hacerla la principal y eliminarla.
 */
export function ConnectionActions({
  connectionId,
  label,
  active,
  primary,
  kind = "channel_connection",
  typeId,
  manual = false,
  conActivar = false,
  redirectTo,
}: {
  connectionId: string;
  label: string;
  active: boolean;
  primary: boolean;
  kind?: "channel_connection" | "meta_connection";
  typeId?: string | null;
  /** La conexión se configura con formulario manual (correo, etc.). */
  manual?: boolean;
  /** Activar y desactivar desde el menú, cuando la conexión no lleva el botón Pausar. */
  conActivar?: boolean;
  /** A dónde ir después de eliminarla. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { run, pending } = useAction();
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
    const res = await fetch(`/api/connections/manual/${encodeURIComponent(typeId)}?connectionId=${connectionId}`);
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
        description: "El negocio dejará de usar esta conexión hasta que la vuelvas a activar.",
        confirmLabel: "Desactivar",
        destructive: true,
      });
      if (!aceptado) return;
    }
    await run(post.bind(null, action));
  }

  return (
    <>
      <MenuDeFila etiqueta={`Más acciones de ${label}`}>
        {manual && (
          <DropdownMenuItem icon={<Eye />} onSelect={() => setDatosOpen(true)}>
            Ver datos
          </DropdownMenuItem>
        )}
        {manual && typeId && (
          <DropdownMenuItem icon={<KeyRound />} onSelect={() => void openEdit()}>
            Editar datos
          </DropdownMenuItem>
        )}
        {conActivar && (
          <DropdownMenuItem icon={<Power />} disabled={pending} onSelect={() => void runAccion(active ? "deactivate" : "activate")}>
            {active ? "Desactivar" : "Activar"}
          </DropdownMenuItem>
        )}
        {kind === "channel_connection" && !primary && (
          <DropdownMenuItem icon={<Star />} disabled={pending} onSelect={() => void runAccion("primary")}>
            Hacerla la principal
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem icon={<Trash2 />} tone="danger" disabled={pending} onSelect={() => setDeleteOpen(true)}>
          {kind === "meta_connection" ? "Eliminar la cuenta" : "Eliminar"}
        </DropdownMenuItem>
      </MenuDeFila>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title="Editar datos" description={label} className="max-w-xl">
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
            <div role="status" aria-busy="true" aria-label="Cargando los datos de la conexión" className="flex flex-col gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <VerCredencialesDialog connectionId={connectionId} label={label} open={datosOpen} onOpenChange={setDatosOpen} />
      <EliminarCuentaDialog
        connectionId={connectionId}
        label={label}
        kind={kind}
        redirectTo={redirectTo}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
