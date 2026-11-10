"use client";

import { useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { MenuDeFila } from "@/components/domain/menu-de-fila";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { FormFeedback } from "@/components/ui/form-feedback";
import { toast } from "@/lib/toast-store";

/** Trae de Meta las plantillas y su estado; es secundaria, así que va como botón sin relleno. */
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
      setStatus({ error: json.error ?? "No se pudieron traer las plantillas de Meta." });
      return;
    }
    setStatus({ success: "Plantillas al día." });
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="ghost" onClick={() => void sync()} loading={status.loading}>
        {!status.loading && <RefreshCw className="h-4 w-4" aria-hidden />} Traer de Meta
      </Button>
      <FormFeedback error={status.error} success={status.success} />
    </div>
  );
}

/** Menú de una plantilla: por ahora, eliminarla (todas sus versiones de idioma). */
export function MenuPlantilla({ connectionId, templateId, nombre }: { connectionId: string; templateId: string; nombre: string }) {
  const router = useRouter();
  const confirm = useConfirm();

  async function eliminar() {
    const ok = await confirm({
      title: `¿Eliminar «${nombre}»?`,
      description: "Se eliminan todas sus versiones de idioma. Meta no permite deshacerlo.",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/meta/connections/${connectionId}/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", template_id: templateId }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast.error(json.error ?? "No se pudo eliminar la plantilla.");
      return;
    }
    toast.success("Plantilla eliminada.");
    router.refresh();
  }

  return (
    <MenuDeFila etiqueta={`Más acciones de ${nombre}`}>
      <DropdownMenuItem icon={<Trash2 />} tone="danger" onSelect={() => void eliminar()}>
        Eliminar
      </DropdownMenuItem>
    </MenuDeFila>
  );
}
