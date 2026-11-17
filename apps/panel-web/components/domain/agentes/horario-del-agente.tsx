"use client";

import { useId, useState } from "react";

import { EditorDeFranjas } from "@/components/domain/editor-de-franjas";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { Franja } from "@/lib/horario-atencion";
import { enPalabras, franjasDe, problemaDelHorario, zonaDe, type HorarioDelAgente } from "@/lib/horario-del-agente";
import { toast } from "@/lib/toast-store";

type Modo = "negocio" | "agente";

/**
 * «Horario de este agente» en Personalizar › Horario y reglas (HU-AOS-82): «Heredado del negocio» o
 * «Cambiar solo para este agente». Se guarda en el borrador (entra con la próxima publicación) y no
 * toca el horario de los demás agentes. El modo (si bloquea o informa) y el aviso son del negocio.
 */
export function HorarioDelAgenteEditable({
  agenteId,
  inicial,
  lockVersion,
  onLockVersion,
  puedeEditar,
  zonaDelNegocio,
}: {
  agenteId: string;
  inicial: HorarioDelAgente;
  lockVersion: number;
  onLockVersion: (lock: number) => void;
  puedeEditar: boolean;
  zonaDelNegocio: string;
}) {
  const id = useId();
  const [guardado, setGuardado] = useState(inicial);
  const [modo, setModo] = useState<Modo>(inicial.source === "agente" ? "agente" : "negocio");
  const [franjas, setFranjas] = useState<Franja[]>(() =>
    franjasDe(inicial.schedule ?? inicial.business_hours ?? null),
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deNegocio = enPalabras(guardado.business_hours ?? null);
  const sinCambios =
    (modo === "negocio" && guardado.source === "negocio") ||
    (modo === "agente" && guardado.source === "agente" && JSON.stringify(franjas) === JSON.stringify(franjasDe(guardado.schedule ?? null)));

  async function guardar() {
    const problema = modo === "agente" ? problemaDelHorario(franjas) : null;
    if (problema) {
      setError(problema);
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      const schedule = modo === "agente" ? { tz: zonaDe(guardado.schedule ?? guardado.business_hours ?? null, zonaDelNegocio), ranges: franjas } : null;
      const res = await fetch(`/api/agent-editor/${agenteId}/schedule`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ schedule, lock_version: lockVersion }),
      });
      const cuerpo = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof cuerpo?.error === "string" ? cuerpo.error : "No pudimos guardar el horario. Inténtalo de nuevo.");
        return;
      }
      const nuevo = cuerpo as HorarioDelAgente;
      setGuardado(nuevo);
      onLockVersion(nuevo.lock_version);
      toast.success(modo === "agente" ? "Horario de este agente guardado. Entra con la próxima publicación." : "Vuelve al horario del negocio con la próxima publicación.");
    } catch {
      setError("No hay conexión con el servidor. Inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-3 rounded-md border border-border-soft p-4">
      <h3 id={`${id}-titulo`} className="text-sm font-medium text-headline">
        Horario de este agente
      </h3>
      <SegmentedControl
        label="De dónde sale el horario de este agente"
        value={modo}
        onChange={(v) => {
          if (puedeEditar && !guardando) setModo(v as Modo);
        }}
        options={[
          { value: "negocio", label: "Heredado del negocio" },
          { value: "agente", label: "Cambiar solo para este agente" },
        ]}
      />
      {modo === "negocio" ? (
        <p className="text-sm text-body">
          Usa el horario del negocio: <span className="text-headline">{deNegocio}</span>.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-text-soft">Solo cambia para este agente; los demás siguen con el del negocio.</p>
          <EditorDeFranjas id={`${id}-franjas`} franjas={franjas} onChange={setFranjas} disabled={!puedeEditar || guardando} />
        </div>
      )}
      <FormFeedback error={error} />
      {puedeEditar && (
        <div>
          <Button type="button" variant="outline" className="min-h-11" loading={guardando} disabled={sinCambios} onClick={() => void guardar()}>
            Guardar horario del agente
          </Button>
        </div>
      )}
    </section>
  );
}
