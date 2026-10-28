"use client";

import { TENANT_STATUS } from "@/components/domain/status-badge";
import { useConfirm } from "@/components/ui/confirm";
import { Switch } from "@/components/ui/switch";
import type { PlatformTenant } from "@/lib/api/types";
import { useAction } from "@/lib/use-action";

/** Interruptor de estado del negocio con confirmación (master). */
export function TenantStatusToggle({ tenant }: { tenant: PlatformTenant }) {
  const confirm = useConfirm();
  const { run, pending } = useAction();
  const activo = tenant.status === "active";
  const nombre = tenant.name || tenant.slug;
  const etiqueta = TENANT_STATUS[tenant.status]?.label ?? tenant.status;

  async function cambiar() {
    const suspender = activo;
    const ok = await confirm({
      title: suspender ? `Suspender ${nombre}` : `Activar ${nombre}`,
      description: suspender
        ? `${nombre} dejará de operar hasta que lo reactives. Sus datos y conversaciones se conservan.`
        : `${nombre} volverá a operar de inmediato con el plan actual.`,
      confirmLabel: suspender ? "Suspender" : "Activar",
      destructive: suspender,
    });
    if (!ok) return;

    await run(async () => {
      const res = await fetch(`/api/platform/tenants/${tenant.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: suspender ? "deactivate" : "activate" }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        return { ok: false, status: res.status, error: json.error ?? "No se pudo cambiar el estado." };
      }
      return { ok: true, success: suspender ? "Negocio suspendido." : "Negocio activado." };
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="text-sh-label text-body">{etiqueta}</span>
      <Switch
        checked={activo}
        disabled={pending}
        onCheckedChange={() => void cambiar()}
        tone="success"
        aria-label={activo ? `Suspender ${nombre}` : `Activar ${nombre}`}
      />
    </div>
  );
}
