"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import {
  AVISO_DUENO_RESTRINGIDO,
  LIMITE_DE_LA_POLITICA,
  ROLES_POLITICA,
  VALOR_POLITICA,
  cuentasSinEquipo,
  hayCambios,
  restringeAlDueno,
  type PoliticaAcceso,
  type ValorPolitica,
} from "@/lib/seguridad";
import { useAction } from "@/lib/use-action";

/**
 * Política de dispositivos por rol (solo dueño o administrador de plataforma la cambia).
 * Dice qué frena y qué no (ADR-0174 §8) y avisa antes de dejar al dueño en «Restringido».
 */
export function PoliticaDeAcceso({ politica, puedeEditar }: { politica: PoliticaAcceso; puedeEditar: boolean }) {
  const confirm = useConfirm();
  const { run, pending } = useAction();
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
        title: "Restringir al dueño",
        description: AVISO_DUENO_RESTRINGIDO,
        confirmLabel: "Restringir",
        destructive: true,
      });
      if (!sigue) return;
    }
    await run(() => guardar(false));
  }

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-headline">Política de dispositivos</h2>
        <p className="text-sm text-body">Qué pasa cuando una cuenta entra desde un equipo que no conoces, según su rol.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {ROLES_POLITICA.map(({ clave, label, detalle }) => (
          <Field
            key={clave}
            label={label}
            htmlFor={`politica-${clave}`}
            help={VALOR_POLITICA[borrador[clave]].explicacion || detalle}
          >
            <Select
              id={`politica-${clave}`}
              value={borrador[clave]}
              disabled={!puedeEditar || pending}
              onChange={(e) =>
                setBorrador({ ...borrador, [clave]: e.target.value === "restringido" ? "restringido" : ("abierto" satisfies ValorPolitica) })
              }
            >
              <option value="abierto">{VALOR_POLITICA.abierto.label}</option>
              <option value="restringido">{VALOR_POLITICA.restringido.label}</option>
            </Select>
          </Field>
        ))}
      </div>
      <p className="flex items-start gap-2 rounded-md border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-fg">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{LIMITE_DE_LA_POLITICA}</span>
      </p>
      {puedeEditar ? (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" disabled={!cambios || pending} onClick={() => setBorrador(politica)}>
            Descartar
          </Button>
          <Button type="button" size="sm" disabled={!cambios || pending} onClick={() => void onGuardar()}>
            Guardar política
          </Button>
        </div>
      ) : (
        <p className="text-sm text-text-soft">Solo el dueño del negocio puede cambiar la política.</p>
      )}
    </Card>
  );
}
