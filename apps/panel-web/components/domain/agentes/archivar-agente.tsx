"use client";

import { Archive, ArchiveRestore } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { useAction } from "@/lib/use-action";

/** Lo que pide cada 409 del PATCH del agente, en palabras del dueño. */
const ERRORES: Record<string, string> = {
  agent_in_use: "Este agente sigue atendiendo en una conexión. Quítalo en la pestaña Conexiones y vuelve a archivarlo.",
};

/**
 * Archivar o reactivar un agente desde su ficha. Archivado no atiende, no se edita, no se publica y
 * no cuenta en el plan; sus conversaciones y registros se quedan. El General y el Coordinador no
 * llegan aquí (`puedeArchivar`), y la API los rechaza igual (409 `agent_reserved`).
 */
export function ArchivarAgente({ agenteId, nombre, archivado }: { agenteId: string; nombre: string; archivado: boolean }) {
  const confirm = useConfirm();
  const { run, pending } = useAction();

  async function cambiar() {
    const ok = await confirm(
      archivado
        ? {
            title: `¿Reactivar a ${nombre}?`,
            description: "Vuelve a poder editarse y publicarse. Para que atienda, agrégalo a una conexión.",
            confirmLabel: "Reactivar",
            destructive: false,
          }
        : {
            title: `¿Archivar a ${nombre}?`,
            description:
              "Deja de poder editarse y publicarse, y no cuenta en tu plan. Sus conversaciones y registros se conservan, y puedes reactivarlo cuando quieras.",
            confirmLabel: "Archivar",
          },
    );
    if (!ok) return;
    await run(async () => {
      const res = await fetch(`/api/agent-editor/${agenteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: archivado ? "active" : "archived" }),
      });
      if (res.ok) return { ok: true, success: archivado ? "Agente reactivado." : "Agente archivado." };
      const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      return {
        ok: false,
        status: res.status,
        error: (json.code && ERRORES[json.code]) || json.error || "No se pudo guardar.",
      };
    });
  }

  return (
    <Button variant="outline" onClick={cambiar} disabled={pending}>
      {archivado ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
      {archivado ? "Reactivar" : "Archivar"}
    </Button>
  );
}
