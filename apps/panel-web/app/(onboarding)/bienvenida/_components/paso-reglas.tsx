"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FRASES_SUGERIDAS_PROHIBIDAS,
  FRASE_MAX,
  MAX_PROHIBIDAS,
  MOTIVOS_DE_ESCALAR,
  agregarFrase,
  type EstadoDelAsistente,
  type MotivoDeEscalar,
} from "@/lib/onboarding";

import { FichaMultiple, GrupoDeOpciones } from "./elegibles";
import { SelectorDeHorario } from "./selector-de-horario";

/** Paso 3: horario del comercio (informativo: el agente responde siempre), cuándo pasar a una persona y qué no decir. */
export function PasoReglas({
  estado,
  onCambiar,
}: {
  estado: EstadoDelAsistente;
  onCambiar: (cambios: Partial<EstadoDelAsistente>) => void;
}) {
  const [nueva, setNueva] = useState("");

  function alternarMotivo(id: MotivoDeEscalar, on: boolean) {
    onCambiar({ motivos: on ? [...estado.motivos, id] : estado.motivos.filter((m) => m !== id) });
  }

  function agregar(frase: string) {
    onCambiar({ prohibidas: agregarFrase(estado.prohibidas, frase) });
    setNueva("");
  }

  const sugeridas = FRASES_SUGERIDAS_PROHIBIDAS.filter((f) => !estado.prohibidas.some((p) => p.toLowerCase() === f.toLowerCase()));

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="onb-horario" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 id="onb-horario" className="font-display text-base font-semibold text-headline">
            Horario de tu equipo
          </h3>
          <p className="text-sm text-body">
            Tu agente responde las 24 horas. Este horario es para que sepa cuándo te pueden atender a ti y a tu equipo.
          </p>
        </div>
        <SelectorDeHorario valor={estado.horario} onCambiar={(horario) => onCambiar({ horario })} />
      </section>

      <GrupoDeOpciones titulo="¿Cuándo debe pasar a una persona?" ayuda="Elige todo lo que aplique.">
        {MOTIVOS_DE_ESCALAR.map((m) => (
          <FichaMultiple key={m.id} elegida={estado.motivos.includes(m.id)} onCambiar={(on) => alternarMotivo(m.id, on)}>
            {m.titulo}
          </FichaMultiple>
        ))}
      </GrupoDeOpciones>

      <section aria-labelledby="onb-prohibidas" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 id="onb-prohibidas" className="font-display text-base font-semibold text-headline">
            Qué no debe decir
          </h3>
          <p className="text-sm text-text-soft">Toca una sugerencia o escribe la tuya.</p>
        </div>
        {estado.prohibidas.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Frases que no dirá">
            {estado.prohibidas.map((f) => (
              <li key={f}>
                <button
                  type="button"
                  onClick={() => onCambiar({ prohibidas: estado.prohibidas.filter((p) => p !== f) })}
                  aria-label={`Quitar «${f}»`}
                  className="flex min-h-11 items-center gap-2 rounded-full border border-focus bg-focus/15 px-4 text-sm text-headline"
                >
                  «{f}»
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {sugeridas.length > 0 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Sugerencias">
            {sugeridas.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => agregar(f)}
                className="flex min-h-11 items-center gap-2 rounded-full border border-dashed border-control-border px-4 text-sm text-body hover:border-focus/60"
              >
                <Plus className="h-4 w-4" aria-hidden />
                {f}
              </button>
            ))}
          </div>
        )}
        <form
          className="flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            agregar(nueva);
          }}
        >
          <Input
            aria-label="Otra frase que no debe decir"
            value={nueva}
            maxLength={FRASE_MAX}
            placeholder="Otra frase…"
            disabled={estado.prohibidas.length >= MAX_PROHIBIDAS}
            onChange={(e) => setNueva(e.target.value)}
          />
          <Button type="submit" variant="outline" disabled={!nueva.trim() || estado.prohibidas.length >= MAX_PROHIBIDAS}>
            Agregar
          </Button>
        </form>
      </section>
    </div>
  );
}
