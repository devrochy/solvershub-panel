"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FormFeedback } from "@/components/ui/form-feedback";

/** Sincroniza las plantillas con Meta. */
export function SyncTemplatesButton({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  async function sync() {
    setStatus({ loading: true });
    const res = await fetch(`/api/meta/connections/${connectionId}/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync" }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo sincronizar." });
      return;
    }
    setStatus({ success: "Plantillas sincronizadas." });
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" onClick={() => void sync()} disabled={status.loading}>
        {status.loading ? "Sincronizando…" : "Sincronizar"}
      </Button>
      <FormFeedback error={status.error} success={status.success} />
    </div>
  );
}

/** Elimina una plantilla (todas sus versiones de idioma). */
export function DeleteTemplateButton({
  connectionId,
  templateId,
  label,
}: {
  connectionId: string;
  templateId: string;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});

  async function remove() {
    setStatus({ loading: true });
    const res = await fetch(`/api/meta/connections/${connectionId}/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", template_id: templateId }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo eliminar." });
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Eliminar
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Eliminar plantilla"
        description={label}
        className="max-w-md"
      >
        <p className="text-sm text-body">
          Se eliminan <strong>todas</strong> las versiones de idioma. Meta no permite deshacerlo.
        </p>
        <FormFeedback error={status.error} className="mt-3" />
        <div className="mt-6 flex justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" variant="danger" onClick={() => void remove()} disabled={status.loading}>
            {status.loading ? "Eliminando…" : "Eliminar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
