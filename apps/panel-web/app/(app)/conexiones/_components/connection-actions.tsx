"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Separator } from "@/components/ui/separator";
import { JsonSchemaForm } from "@/components/domain/json-schema-form";

/** Acciones de una conexión: activar/desactivar, hacer principal y eliminar. */
export function ConnectionActions({
  connectionId,
  label,
  active,
  primary,
  kind = "channel_connection",
  typeId,
}: {
  connectionId: string;
  label: string;
  active: boolean;
  primary: boolean;
  kind?: "channel_connection" | "meta_connection";
  typeId?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<
    | { schema: Record<string, unknown>; values: Record<string, unknown>; configured_secrets: string[] }
    | null
  >(null);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

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
      setStatus({ error: json?.error ?? "No se pudo cargar la conexión." });
      setEditOpen(false);
      return;
    }
    setForm(json);
  }

  async function run(action: "activate" | "deactivate" | "primary" | "delete") {
    setStatus({ loading: true });
    const res = await fetch(`/api/connections/${connectionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, kind }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo completar la acción." });
      return;
    }
    setStatus({ success: "Listo." });
    if (action === "delete") setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconAction label={`Acciones de ${label}`} tone="neutro">
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </IconAction>
      </DialogTrigger>
      <DialogContent title="Acciones de la conexión" description={label} className="max-w-md">
        <div className="flex flex-col gap-4">
          {kind === "channel_connection" && typeId && (
            <Button variant="outline" size="sm" onClick={() => void openEdit()}>
              Editar credenciales
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void run(active ? "deactivate" : "activate")}
            disabled={status.loading}
          >
            {active ? "Desactivar" : "Activar"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void run("primary")}
            disabled={status.loading || primary || kind === "meta_connection"}
          >
            {kind === "meta_connection"
              ? "Principal (solo canales manuales)"
              : primary
                ? "Ya es la principal"
                : "Marcar como principal"}
          </Button>

          <Separator />

          <p className="text-sm text-danger">Eliminar la conexión es irreversible.</p>
          <Button
            variant="danger"
            size="sm"
            onClick={() => void run("delete")}
            disabled={status.loading}
          >
            Eliminar conexión
          </Button>

          <FormFeedback error={status.error} success={status.success} />

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
        <DialogContent
          title="Editar credenciales"
          description={label}
          className="max-w-xl"
        >
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
    </Dialog>
  );
}
