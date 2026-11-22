"use client";

import { useState } from "react";
import Link from "next/link";

import { RadioGroup } from "@/components/ui/radio-group";
import { creditosEnPalabras, NIVELES_IA, SE_APLICA_AL_PUBLICAR, type NivelIa } from "@/lib/nivel-ia";
import { RUTA_MEJORAR_PLAN, TEXTO_MEJORAR_PLAN } from "@/lib/plan-limite";
import { useAction } from "@/lib/use-action";

/**
 * Nivel de IA de un agente especialista (HU-BILL-24, HU-BILL-27): Estándar o Avanzado con su gasto
 * aproximado, nunca el modelo. Se guarda al elegir (PATCH del agente) y corre al publicar.
 *
 * `incluyeAvanzado`: `false` atenúa Avanzado con «Mejorar mi plan»; `null` (plan sin leer) no bloquea y,
 * si el plan no lo incluye, el 409 `plan_nivel_ia_not_included` llega como toast con «Mejorar mi plan».
 */
export function NivelDeIa({
  agenteId,
  inicial,
  incluyeAvanzado,
  puedeEditar,
}: {
  agenteId: string;
  inicial: NivelIa;
  incluyeAvanzado: boolean | null;
  puedeEditar: boolean;
}) {
  const [nivel, setNivel] = useState<NivelIa>(inicial);
  const { run, pending } = useAction({ refresh: false });
  const bloqueado = incluyeAvanzado === false;

  async function elegir(valor: string) {
    const nuevo = valor as NivelIa;
    if (nuevo === nivel) return;
    const previo = nivel;
    setNivel(nuevo);
    await run(async () => {
      const res = await fetch(`/api/agent-editor/${agenteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nivel_ia: nuevo }),
      }).catch((e: unknown) => {
        setNivel(previo);
        throw e;
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!res.ok) {
        // La API no escribió nada (409 del plan, Coordinador…): vuelve el nivel que había.
        setNivel(previo);
        return { ok: false, status: res.status, error: json.error ?? "No se pudo cambiar el nivel de IA.", code: json.code };
      }
      return { ok: true, success: `Nivel ${nuevo === "avanzado" ? "Avanzado" : "Estándar"} guardado. Se aplica al publicar.` };
    });
  }

  return (
    <div className="flex max-w-xl flex-col gap-3">
      <RadioGroup
        label="Nivel de IA"
        name={`nivel-ia-${agenteId}`}
        value={nivel}
        onValueChange={elegir}
        disabled={!puedeEditar || pending}
        options={NIVELES_IA.map((n) => ({
          value: n.value,
          label: `${n.label} · ${creditosEnPalabras(n.value)}`,
          description: n.value === "avanzado" && bloqueado ? "Tu plan no incluye el nivel Avanzado." : n.descripcion,
          // El nivel vigente nunca se atenúa: si el plan ya no lo incluye, se puede volver a Estándar.
          disabled: n.value === "avanzado" && bloqueado && nivel !== "avanzado",
        }))}
      />
      {bloqueado && (
        <p className="text-sm text-body">
          {nivel === "avanzado" ? "Tu plan ya no incluye Avanzado: este agente atiende en Estándar. " : "Avanzado viene en Premium y Empresarial. "}
          <Link href={RUTA_MEJORAR_PLAN} className="font-medium text-link underline underline-offset-2">
            {TEXTO_MEJORAR_PLAN}
          </Link>
        </p>
      )}
      <p className="text-xs text-text-soft">{SE_APLICA_AL_PUBLICAR}</p>
    </div>
  );
}
