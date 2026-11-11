"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Trash2 } from "lucide-react";

import { MenuDeFila } from "@/components/domain/menu-de-fila";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import {
  RUTA_DE_ACCION,
  cuerpoDeAccion,
  equipoEnPalabras,
  mensajeDeAccionRechazada,
  quienEs,
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

/**
 * Acciones de un equipo (SEG-01, SEG-03). Solo recibe las que la API aceptaría para quien mira
 * (`accionesDeDispositivo`). La del estado va con texto («Aprobar», «Reactivar»); bloquear y dar de
 * baja, en «Más acciones». En «Necesita atención» (`atencion`) un equipo pendiente ofrece
 * «Rechazar» y «Aprobar» a la vista. Cada acción manda el estado que se veía: si el equipo cambió
 * mientras tanto (409), se refresca y se explica.
 */
export function AccionesDeDispositivo({
  dispositivo,
  acciones,
  atencion = false,
}: {
  dispositivo: DispositivoAcceso;
  acciones: AccionDispositivo[];
  atencion?: boolean;
}) {
  const confirm = useConfirm();
  const router = useRouter();
  const { run, pending } = useAction();
  const [bloqueando, setBloqueando] = useState(false);
  const [alcance, setAlcance] = useState<"cuenta" | "equipo">("cuenta");
  const [motivo, setMotivo] = useState("");
  const quien = quienEs(dispositivo.cuenta);
  const nombre = `el ${equipoEnPalabras(dispositivo)} de ${quien}`;

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
      const pendiente = dispositivo.estado === "pendiente";
      const ok = await confirm({
        title: pendiente ? `¿Rechazar ${nombre}?` : `¿Dar de baja ${nombre}?`,
        description:
          "El equipo sale de la lista. Si su rol necesita aprobación, para volver a entrar tendrá que pedirla otra vez.",
        confirmLabel: pendiente ? "Rechazar" : "Dar de baja",
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

  if (acciones.length === 0) return null;
  const principal = acciones.find((a) => a === "aprobar" || a === "reactivar");
  const enMenu = acciones.filter((a) => a === "bloquear" || (a === "dar_de_baja" && !(atencion && dispositivo.estado === "pendiente")));

  return (
    <div className="flex items-center justify-end gap-2">
      {atencion && dispositivo.estado === "pendiente" && acciones.includes("dar_de_baja") && (
        <Button type="button" variant="outline" size="sm" onClick={() => void pedir("dar_de_baja")} disabled={pending} aria-label={`Rechazar ${nombre}`}>
          Rechazar
        </Button>
      )}
      {principal && (
        <Button
          type="button"
          variant={atencion ? "accent" : "outline"}
          size="sm"
          onClick={() => void pedir(principal)}
          disabled={pending}
          aria-label={`${principal === "aprobar" ? "Aprobar" : "Reactivar"} ${nombre}`}
        >
          {principal === "aprobar" ? "Aprobar" : "Reactivar"}
        </Button>
      )}
      {enMenu.length > 0 && (
        <MenuDeFila etiqueta={`Más acciones de ${nombre}`}>
          {enMenu.includes("bloquear") && (
            <DropdownMenuItem icon={<Ban aria-hidden />} onSelect={() => void pedir("bloquear")} disabled={pending}>
              Bloquear
            </DropdownMenuItem>
          )}
          {enMenu.includes("dar_de_baja") && (
            <DropdownMenuItem tone="danger" icon={<Trash2 aria-hidden />} onSelect={() => void pedir("dar_de_baja")} disabled={pending}>
              {dispositivo.estado === "pendiente" ? "Rechazar" : "Dar de baja"}
            </DropdownMenuItem>
          )}
        </MenuDeFila>
      )}
      <Dialog open={bloqueando} onOpenChange={setBloqueando}>
        <DialogContent title="Bloquear equipo" description={`${equipoEnPalabras(dispositivo)} de ${quien}`} className="max-w-md">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-headline">¿Qué se bloquea?</span>
              <SegmentedControl
                label="Qué se bloquea"
                value={alcance}
                onChange={(v) => setAlcance(v === "equipo" ? "equipo" : "cuenta")}
                options={[
                  { value: "cuenta", label: "Solo esta cuenta" },
                  { value: "equipo", label: "El equipo entero" },
                ]}
              />
              <span className="text-sm text-text-soft">
                {alcance === "cuenta"
                  ? `${quien} no podrá entrar desde este equipo.`
                  : "Nadie podrá entrar desde este equipo, con ninguna cuenta. Úsalo si se perdió o lo comparten."}
              </span>
            </div>
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
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="button" variant="danger" onClick={() => void bloquear()} disabled={pending}>
                Bloquear
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
