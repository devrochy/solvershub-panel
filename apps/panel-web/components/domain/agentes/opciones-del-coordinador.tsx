"use client";

import { useId, useState } from "react";
import Link from "next/link";

import { ReglasDelAgenteEditable } from "@/components/domain/agentes/reglas-del-agente";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cambiosDeVoz, type OpcionesDelCoordinador } from "@/lib/coordinador-voz";
import type { ReglasDelAgente } from "@/lib/reglas-y-tools-del-agente";
import { creditosEnPalabras, NIVELES_IA, type NivelIa } from "@/lib/nivel-ia";
import { RUTA_MEJORAR_PLAN, TEXTO_MEJORAR_PLAN } from "@/lib/plan-limite";
import { toast } from "@/lib/toast-store";

async function guardarOpciones(cambios: Record<string, unknown>) {
  const res = await fetch("/api/coordinator", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cambios),
  });
  const cuerpo = (await res.json().catch(() => null)) as
    | (OpcionesDelCoordinador & { error?: string; code?: string; fields?: Record<string, string> })
    | null;
  return { ok: res.ok, status: res.status, cuerpo };
}

/**
 * Opciones propias del Coordinador (HU-AOS-98, ADR-0211): voz e identidad, horario, nivel de IA y reglas de la
 * recepción. No es un agente editable: cada sección escribe en el dato que ya lo gobierna y entra con la siguiente
 * publicación (el horario rige al guardar). Las tools y las habilidades del Coordinador siguen cerradas.
 */
export function OpcionesDelCoordinador({
  inicial,
  agenteId,
  puedeEditar,
  incluyeAvanzado = null,
}: {
  inicial: OpcionesDelCoordinador;
  agenteId: string;
  puedeEditar: boolean;
  incluyeAvanzado?: boolean | null;
}) {
  const id = useId();
  const [guardada, setGuardada] = useState(inicial);
  const [voz, setVoz] = useState({
    assistant_name: inicial.assistant_name,
    business_description: inicial.business_description,
    brand_voice: inicial.brand_voice,
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cambios = cambiosDeVoz(guardada, voz);
  const sinCambios = Object.keys(cambios).length === 0;

  async function guardarVoz() {
    setError(null);
    setGuardando(true);
    try {
      const r = await guardarOpciones(cambios);
      if (!r.ok || !r.cuerpo) {
        setError(r.cuerpo?.error ?? "No pudimos guardar. Inténtalo de nuevo.");
        return;
      }
      setGuardada(r.cuerpo);
      toast.success("Voz guardada. Entra con la próxima publicación.");
    } catch {
      setError("No hay conexión con el servidor. Inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  async function elegirNivel(valor: string) {
    const nuevo = valor as NivelIa;
    if (nuevo === guardada.nivel_ia) return;
    const r = await guardarOpciones({ nivel_ia: nuevo }).catch(() => null);
    if (!r?.ok || !r.cuerpo) {
      toast.error(r?.cuerpo?.error ?? "No se pudo cambiar el nivel de IA.");
      return;
    }
    setGuardada(r.cuerpo);
    toast.success(`Nivel ${nuevo === "avanzado" ? "Avanzado" : "Estándar"} guardado. Entra con la próxima publicación.`);
  }

  const bloqueado = incluyeAvanzado === false;
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <p className="text-sm text-body">
        El Coordinador recibe todos los mensajes y los reparte a tus agentes. Solo conversa él cuando el negocio no tiene
        especialistas; con especialistas, estas opciones no se notan en la conversación. Sus herramientas y habilidades
        las fija el sistema.
      </p>

      <section aria-labelledby={`${id}-voz`} className="flex flex-col gap-3 rounded-md border border-border-soft p-4">
        <h3 id={`${id}-voz`} className="text-sm font-medium text-headline">
          Voz e identidad
        </h3>
        <Field label="Nombre del asistente" htmlFor={`${id}-nombre`}>
          <Input
            id={`${id}-nombre`}
            value={voz.assistant_name}
            maxLength={120}
            disabled={!puedeEditar || guardando}
            onChange={(e) => setVoz((v) => ({ ...v, assistant_name: e.target.value }))}
          />
        </Field>
        <Field label="Qué hace tu negocio" htmlFor={`${id}-desc`}>
          <Textarea
            id={`${id}-desc`}
            value={voz.business_description}
            maxLength={4000}
            disabled={!puedeEditar || guardando}
            onChange={(e) => setVoz((v) => ({ ...v, business_description: e.target.value }))}
          />
        </Field>
        <Field label="Cómo habla tu marca" htmlFor={`${id}-voz-marca`}>
          <Textarea
            id={`${id}-voz-marca`}
            value={voz.brand_voice}
            maxLength={4000}
            disabled={!puedeEditar || guardando}
            onChange={(e) => setVoz((v) => ({ ...v, brand_voice: e.target.value }))}
          />
        </Field>
        <FormFeedback error={error} />
        {puedeEditar && (
          <div>
            <Button type="button" className="min-h-11" loading={guardando} disabled={sinCambios} onClick={() => void guardarVoz()}>
              Guardar voz
            </Button>
          </div>
        )}
      </section>

      <section aria-labelledby={`${id}-nivel`} className="flex flex-col gap-3 rounded-md border border-border-soft p-4">
        <h3 id={`${id}-nivel`} className="text-sm font-medium text-headline">
          Nivel de IA de la recepción
        </h3>
        <RadioGroup
          label="Nivel de IA"
          name={`nivel-coordinador-${agenteId}`}
          value={guardada.nivel_ia}
          onValueChange={(v) => void elegirNivel(v)}
          disabled={!puedeEditar}
          options={NIVELES_IA.map((n) => ({
            value: n.value,
            label: `${n.label} · ${creditosEnPalabras(n.value)}`,
            description: n.value === "avanzado" && bloqueado ? "Tu plan no incluye el nivel Avanzado." : n.descripcion,
            disabled: n.value === "avanzado" && bloqueado && guardada.nivel_ia !== "avanzado",
          }))}
        />
        {bloqueado && (
          <p className="text-sm text-body">
            Avanzado viene en Premium y Empresarial.{" "}
            <Link href={RUTA_MEJORAR_PLAN} className="font-medium text-link underline underline-offset-2">
              {TEXTO_MEJORAR_PLAN}
            </Link>
          </p>
        )}
      </section>

      <section aria-labelledby={`${id}-horario`} className="flex flex-col gap-2 rounded-md border border-border-soft p-4">
        <h3 id={`${id}-horario`} className="text-sm font-medium text-headline">
          Horario
        </h3>
        <p className="text-sm text-body">
          {guardada.business_ranges.length === 0
            ? "Sin horario: atiende a toda hora."
            : `${guardada.business_ranges.length} franja(s) en ${guardada.business_tz}.`}{" "}
          Es el horario de todo el negocio y rige apenas lo guardas.
        </p>
        <div>
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/configuracion?seccion=horario">Editar el horario del negocio</Link>
          </Button>
        </div>
      </section>

      {guardada.guardrails_problems && guardada.guardrails_problems.length > 0 && (
        <FormFeedback
          error={`Hay reglas guardadas que ya no son válidas y bloquean publicar: ${guardada.guardrails_problems.join("; ")}. Corrígelas o quítalas.`}
        />
      )}
      <ReglasDelAgenteEditable
        coordinador
        agenteId={agenteId}
        inicial={{ guardrails: guardada.guardrails as ReglasDelAgente["guardrails"], lock_version: 0 }}
        lockVersion={0}
        onGuardado={() => undefined}
        puedeEditar={puedeEditar}
        acciones={[]}
      />
    </div>
  );
}
