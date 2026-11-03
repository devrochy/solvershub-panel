"use client";

import { Pause, Play, Zap } from "lucide-react";

import { EditorHorario } from "@/app/(app)/plataforma/crons/_components/editor-horario";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import type { Cron } from "@/lib/api/types";
import { ACCION_LABEL, confirmacionDeCron, type AccionDeBoton } from "@/lib/crons";
import { useAction } from "@/lib/use-action";

const ICONO = { run: Zap, pause: Pause, resume: Play } as const;
const EXITO: Record<AccionDeBoton, string> = {
  run: "Ejecución encolada. El resultado aparece en el historial.",
  pause: "Cron pausado.",
  resume: "Cron reanudado.",
};

/**
 * Ejecutar ahora, pausar, reanudar y reprogramar un cron (ADR-0183). Solo se ofrecen las acciones que
 * el servidor declara válidas para el estado actual: nunca un 403 por diseño. Los crons que cobran o
 * escriben a clientes (`sensitive`) piden una confirmación reforzada.
 */
export function AccionesCron({ cron }: { cron: Pick<Cron, "name" | "label" | "sensitive" | "paused" | "acciones" | "schedule" | "default_schedule" | "overridden" | "interval_s"> }) {
  const confirm = useConfirm();
  const { run, pending } = useAction();
  const botones = cron.acciones.filter((a): a is AccionDeBoton => a in ICONO);
  const puedeReprogramar = cron.acciones.includes("schedule") || cron.acciones.includes("reset_schedule");
  if (botones.length === 0 && !puedeReprogramar) return null;

  async function ejecutar(accion: AccionDeBoton) {
    const ok = await confirm(confirmacionDeCron(accion, cron));
    if (!ok) return;
    await run(async () => {
      const res = await fetch(`/api/platform/crons/${encodeURIComponent(cron.name)}/${accion}`, { method: "POST" }).catch(() => null);
      if (!res) return { ok: false, error: "No se pudo contactar el servidor." };
      if (res.ok) return { ok: true, success: EXITO[accion] };
      const json = (await res.json().catch(() => ({}))) as { error?: unknown };
      return {
        ok: false,
        status: res.status,
        error: typeof json.error === "string" && json.error ? json.error : "No se pudo completar la acción.",
      };
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Acciones de ${cron.label}`}>
      {botones.map((accion) => {
        const Icono = ICONO[accion];
        return (
          <Button key={accion} type="button" variant="outline" disabled={pending} onClick={() => ejecutar(accion)}>
            <Icono className="h-4 w-4" aria-hidden />
            {ACCION_LABEL[accion]}
          </Button>
        );
      })}
      {puedeReprogramar && <EditorHorario cron={cron} />}
    </div>
  );
}
