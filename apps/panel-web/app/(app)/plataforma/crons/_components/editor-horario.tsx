"use client";

import { useState, type FormEvent } from "react";
import { CalendarClock } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import type { Cron } from "@/lib/api/types";
import {
  ACCION_LABEL,
  PRESETS_CRON,
  confirmacionDeHorario,
  describirCron,
  normalizarCron,
  validarCron,
} from "@/lib/crons";
import { toast } from "@/lib/toast-store";

type Props = {
  cron: Pick<Cron, "name" | "label" | "sensitive" | "acciones" | "schedule" | "default_schedule" | "overridden" | "interval_s">;
};

/**
 * Reprogramar un cron (ADR-0183): presets, campo de 5 campos (UTC) con su descripción en español en
 * vivo, y «Restaurar horario» para volver al del código. El beat lo aplica en menos de un minuto, sin
 * reiniciar. Reprogramar solo está disponible en crons con horario de reloj, no en los de intervalo fijo.
 */
export function EditorHorario({ cron }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(cron.schedule ?? "");
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});
  const puedeCambiar = cron.acciones.includes("schedule");
  const puedeRestaurar = cron.acciones.includes("reset_schedule");
  const error = valor.trim() ? validarCron(valor) : null;
  const limpio = normalizarCron(valor);

  async function llamar(metodo: "PUT" | "DELETE", exito: string) {
    setStatus({ loading: true });
    const res = await fetch(`/api/platform/crons/${encodeURIComponent(cron.name)}/schedule`, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: metodo === "PUT" ? JSON.stringify({ schedule: limpio }) : undefined,
    }).catch(() => null);
    if (!res) {
      setStatus({ error: "No se pudo contactar el servidor." });
      return;
    }
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: unknown };
      setStatus({ error: typeof json.error === "string" && json.error ? json.error : "No se pudo guardar el horario." });
      return;
    }
    setStatus({});
    setOpen(false);
    toast.success(exito);
    router.refresh();
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalido = validarCron(valor);
    if (invalido) {
      setStatus({ error: invalido });
      return;
    }
    const confirmacion = confirmacionDeHorario(cron, limpio);
    if (confirmacion && !(await confirm(confirmacion))) return;
    await llamar("PUT", "Horario actualizado. El beat lo aplica en menos de un minuto.");
  }

  async function restaurar() {
    if (!(await confirm({
      title: `¿Restaurar el horario de «${cron.label}»?`,
      description: `Volverá a correr así: ${describirCron(cron.default_schedule, cron.interval_s)}.`,
      confirmLabel: "Restaurar",
    }))) return;
    await llamar("DELETE", "Horario restaurado al del código.");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        if (abierto) {
          setValor(cron.schedule ?? "");
          setStatus({});
        }
        setOpen(abierto);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <CalendarClock className="h-4 w-4" aria-hidden />
          {ACCION_LABEL.schedule}
        </Button>
      </DialogTrigger>
      <DialogContent
        title={`Horario de «${cron.label}»`}
        description="Cinco campos separados por espacio: minuto, hora, día del mes, mes y día de la semana. Las horas son UTC."
        className="max-w-xl"
      >
        <form onSubmit={guardar} className="flex flex-col gap-4">
          <p className="text-sm text-body">
            Horario del código: <span className="font-medium text-headline">{describirCron(cron.default_schedule, cron.interval_s)}</span>
            {cron.default_schedule && <code className="ml-2 rounded bg-surface-raised px-1.5 py-0.5 text-xs">{cron.default_schedule}</code>}
          </p>
          {puedeCambiar && (
            <>
              <fieldset className="flex flex-wrap gap-2">
                <legend className="mb-1.5 text-[13px] font-medium text-body">Horarios frecuentes</legend>
                {PRESETS_CRON.map((p) => (
                  <Button key={p.value} type="button" size="sm" variant="outline" onClick={() => setValor(p.value)}>
                    {p.label}
                  </Button>
                ))}
              </fieldset>
              <Field
                label="Expresión"
                htmlFor="cron-expresion"
                help={error ? undefined : valor.trim() ? describirCron(limpio) : "Por ejemplo: 0 13 * * *"}
                error={error ?? undefined}
                required
              >
                <Input
                  id="cron-expresion"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                  className="font-mono"
                />
              </Field>
            </>
          )}
          {status.error && <FormFeedback error={status.error} />}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {puedeRestaurar && (
                <Button type="button" variant="ghost" disabled={status.loading} onClick={restaurar}>
                  Restaurar horario
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              {puedeCambiar && (
                <Button type="submit" variant="accent" disabled={status.loading || Boolean(error) || !valor.trim()}>
                  {status.loading ? "Guardando…" : "Guardar horario"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
