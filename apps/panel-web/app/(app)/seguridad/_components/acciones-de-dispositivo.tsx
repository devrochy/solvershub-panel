"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { IconAction } from "@/components/ui/icon-action";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ETIQUETA_DE_ACCION,
  RUTA_DE_ACCION,
  cuerpoDeAccion,
  mensajeDeAccionRechazada,
  nombreDelEquipo,
  type AccionDispositivo,
  type DispositivoAcceso,
} from "@/lib/seguridad";
import { useAction, type ActionResult } from "@/lib/use-action";

const EXITO: Record<AccionDispositivo, string> = {
  aprobar: "Equipo aprobado.",
  reactivar: "Equipo reactivado.",
  bloquear: "Equipo bloqueado.",
  dar_de_baja: "Equipo dado de baja.",
};

const ICONO: Record<AccionDispositivo, ReactNode> = {
  aprobar: <CheckCircle2 className="h-4 w-4" aria-hidden />,
  reactivar: <RotateCcw className="h-4 w-4" aria-hidden />,
  bloquear: <Ban className="h-4 w-4" aria-hidden />,
  dar_de_baja: <Trash2 className="h-4 w-4" aria-hidden />,
};

const TONO = { aprobar: "aprobar", reactivar: "aprobar", bloquear: "eliminar", dar_de_baja: "eliminar" } as const;

/**
 * Acciones de una fila de dispositivos. Solo recibe las que la API aceptaría para quien mira
 * (`accionesDeDispositivo`); cada una manda el estado que se veía y, si el equipo cambió
 * mientras tanto (409), se refresca y se explica.
 */
export function AccionesDeDispositivo({
  dispositivo,
  acciones,
}: {
  dispositivo: DispositivoAcceso;
  acciones: AccionDispositivo[];
}) {
  const confirm = useConfirm();
  const router = useRouter();
  const { run, pending } = useAction();
  const [bloqueando, setBloqueando] = useState(false);
  const [alcance, setAlcance] = useState<"cuenta" | "equipo">("cuenta");
  const [motivo, setMotivo] = useState("");
  const nombre = `${nombreDelEquipo(dispositivo)} de ${dispositivo.cuenta?.email ?? "la cuenta"}`;

  async function enviar(accion: AccionDispositivo, extra: { motivo?: string; alcance?: "cuenta" | "equipo" } = {}) {
    const res = await fetch(`/api/access/devices/${dispositivo.id}/${RUTA_DE_ACCION[accion]}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpoDeAccion(accion, dispositivo, extra)),
    });
    if (res.ok) return { ok: true, status: res.status, success: EXITO[accion] } satisfies ActionResult;
    const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string | null };
    // Otro dueño ya cambió el equipo: se vuelve a leer la lista para que se vea su estado real.
    if (res.status === 409) router.refresh();
    return {
      ok: false,
      status: res.status,
      error: mensajeDeAccionRechazada(res.status, json.code ?? undefined, json.error),
    } satisfies ActionResult;
  }

  async function pedir(accion: AccionDispositivo) {
    if (accion === "bloquear") {
      setBloqueando(true);
      return;
    }
    if (accion === "dar_de_baja") {
      const ok = await confirm({
        title: `Dar de baja: ${nombre}`,
        description:
          "El equipo sale de la lista. Si la política del rol es «Restringido», para volver a entrar tendrá que registrarse otra vez y quedar pendiente de aprobación.",
        confirmLabel: "Dar de baja",
        destructive: true,
      });
      if (!ok) return;
    }
    await run(() => enviar(accion));
  }

  async function bloquear() {
    const ok = await run(() => enviar("bloquear", { alcance, motivo }));
    if (ok) {
      setBloqueando(false);
      setMotivo("");
      setAlcance("cuenta");
    }
  }

  if (acciones.length === 0) return <span className="text-sm text-text-soft">—</span>;

  return (
    <div className="flex items-center justify-end gap-1">
      {acciones.map((accion) => (
        <IconAction
          key={accion}
          tone={TONO[accion]}
          label={`${ETIQUETA_DE_ACCION[accion]}: ${nombre}`}
          onClick={() => void pedir(accion)}
          disabled={pending}
        >
          {ICONO[accion]}
        </IconAction>
      ))}
      <Dialog open={bloqueando} onOpenChange={setBloqueando}>
        <DialogContent title="Bloquear equipo" description={nombre} className="max-w-md">
          <div className="flex flex-col gap-3">
            <Field
              label="¿Qué se bloquea?"
              htmlFor={`alcance-${dispositivo.id}`}
              help="Si el equipo lo usan varias cuentas, bloquea el equipo para cerrarlo a todas."
            >
              <Select
                id={`alcance-${dispositivo.id}`}
                value={alcance}
                onChange={(e) => setAlcance(e.target.value === "equipo" ? "equipo" : "cuenta")}
              >
                <option value="cuenta">Solo esta cuenta en este equipo</option>
                <option value="equipo">El equipo para todas las cuentas</option>
              </Select>
            </Field>
            <Field label="Motivo (opcional)" htmlFor={`motivo-${dispositivo.id}`}>
              <Textarea
                id={`motivo-${dispositivo.id}`}
                value={motivo}
                maxLength={300}
                rows={3}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Por ejemplo: teléfono perdido"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="sm">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="button" variant="danger" size="sm" onClick={() => void bloquear()} disabled={pending}>
                Bloquear
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
