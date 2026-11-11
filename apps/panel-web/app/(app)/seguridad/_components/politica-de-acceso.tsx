"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  AVISO_DUENO_RESTRINGIDO,
  LIMITE_DE_LA_POLITICA,
  ROLES_POLITICA,
  VALOR_POLITICA,
  cuentasSinEquipo,
  hayCambios,
  restringeAlDueno,
  resumenDePolitica,
  type PoliticaAcceso,
} from "@/lib/seguridad";
import { useAction } from "@/lib/use-action";

/**
 * Política de equipos nuevos por rol (SEG-02): se lee en una línea y se cambia en un panel lateral,
 * con un control segmentado por rol. Solo el dueño o el administrador de plataforma la cambia.
 * Dice qué frena y qué no (ADR-0174 §8) y avisa antes de exigir aprobación al dueño.
 */
export function PoliticaDeAcceso({ politica, puedeEditar }: { politica: PoliticaAcceso; puedeEditar: boolean }) {
  const confirm = useConfirm();
  const { run, pending } = useAction();
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState<PoliticaAcceso>(politica);
  const cambios = hayCambios(politica, borrador);

  async function guardar(confirmar: boolean) {
    const res = await fetch("/api/access/policy", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...borrador, confirmar }),
    });
    if (res.ok) return { ok: true, status: res.status, success: "Política guardada." };
    const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string | null; details?: unknown };
    const cuentas = res.status === 409 ? cuentasSinEquipo(json.details) : [];
    if (cuentas.length > 0 && !confirmar) {
      const lista = cuentas.map((c) => c.email).join(", ");
      const sigue = await confirm({
        title: "Hay dueños sin equipo activo",
        description: `${lista} no tiene un equipo activo y quedaría fuera de la app. ¿Guardar de todos modos?`,
        confirmLabel: "Guardar igual",
        destructive: true,
      });
      if (sigue) return guardar(true);
      return { ok: false, status: 409, error: "No se cambió la política." };
    }
    return { ok: false, status: res.status, error: json.error };
  }

  async function onGuardar() {
    if (restringeAlDueno(politica, borrador)) {
      const sigue = await confirm({
        title: "Pedir aprobación al dueño",
        description: AVISO_DUENO_RESTRINGIDO,
        confirmLabel: "Pedir aprobación",
        destructive: true,
      });
      if (!sigue) return;
    }
    const ok = await run(() => guardar(false));
    if (ok) setAbierto(false);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-soft bg-surface px-5 py-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium text-headline">Equipos nuevos</span>
        <span className="text-sm text-body">{resumenDePolitica(politica)}</span>
      </div>
      {puedeEditar ? (
        <Sheet
          open={abierto}
          onOpenChange={(v) => {
            if (v) setBorrador(politica);
            setAbierto(v);
          }}
        >
          <SheetTrigger asChild>
            <Button type="button" variant="outline">
              Cambiar
            </Button>
          </SheetTrigger>
          <SheetContent
            title="Equipos nuevos"
            description="Qué pasa cuando alguien entra a la app desde un equipo que no conoces."
            footer={
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAbierto(false)} disabled={pending}>
                  Cancelar
                </Button>
                <Button type="button" variant="accent" disabled={!cambios || pending} onClick={() => void onGuardar()}>
                  Guardar
                </Button>
              </div>
            }
          >
            <div className="flex flex-col gap-5">
              {ROLES_POLITICA.map(({ clave, label }) => (
                <div key={clave} className="flex flex-col gap-2">
                  <span className="font-medium text-headline">{label}</span>
                  <SegmentedControl
                    label={`Equipos nuevos de ${label.toLowerCase()}`}
                    value={borrador[clave]}
                    onChange={(v) => setBorrador({ ...borrador, [clave]: v === "restringido" ? "restringido" : "abierto" })}
                    options={[
                      { value: "abierto", label: VALOR_POLITICA.abierto.label },
                      { value: "restringido", label: VALOR_POLITICA.restringido.label },
                    ]}
                  />
                  <span className="text-sm text-text-soft">{VALOR_POLITICA[borrador[clave]].explicacion}</span>
                </div>
              ))}
              <p className="flex items-start gap-2 rounded-md border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-fg">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{LIMITE_DE_LA_POLITICA}</span>
              </p>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <span className="text-sm text-text-soft">Solo el dueño del negocio la cambia.</span>
      )}
    </div>
  );
}
