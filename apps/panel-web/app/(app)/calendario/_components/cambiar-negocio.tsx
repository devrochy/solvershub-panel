"use client";

import { Button } from "@/components/ui/button";
import { useAction } from "@/lib/use-action";

/**
 * Aviso cuando la app abrió el calendario para un negocio distinto del activo del panel.
 * El cambio va por POST a `/api/tenant` (valida el acceso antes de fijar la cookie), no
 * por el GET del enlace: abrir una URL nunca cambia el negocio.
 */
export function CambiarNegocioAviso({
  tenantId,
  actual,
}: {
  tenantId: string;
  actual: string | null;
}) {
  const { run, pending } = useAction();

  async function cambiar() {
    await run(async () => {
      const res = await fetch("/api/tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        return { ok: false, error: json?.error ?? "No se pudo cambiar de negocio." };
      }
      return { ok: true, success: "Negocio cambiado." };
    });
  }

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning p-4 text-sm"
    >
      <p className="text-body">
        La app abrió el calendario de otro negocio, pero aquí estás en{" "}
        <span className="text-headline">{actual ?? "otro negocio"}</span>. Cambia de negocio antes de
        conectar Google: la cuenta se guarda en el negocio activo.
      </p>
      <Button size="sm" onClick={() => void cambiar()} disabled={pending}>
        {pending ? "Cambiando…" : "Cambiar al negocio de la app"}
      </Button>
    </div>
  );
}
