"use client";

import { FichaMultiple, FichaUnica, GrupoDeOpciones } from "./elegibles";
import {
  BLOQUES_DE_HORAS,
  DIAS,
  PRESETS_DE_DIAS,
  resumenDeHorario,
  type HorarioElegido,
} from "@/lib/onboarding";

const hora = (h: string) => `${Number(h.slice(0, 2))}:${h.slice(3)}`;

/**
 * Horario de atención del comercio por clics: un atajo de días, los días a mano y un bloque de horas.
 * Es el horario de tu equipo; el agente responde las 24 horas.
 */
export function SelectorDeHorario({
  valor,
  onCambiar,
}: {
  valor: HorarioElegido | null;
  onCambiar: (horario: HorarioElegido | null) => void;
}) {
  const actual: HorarioElegido = valor ?? { dias: [], bloque: null };
  const presetElegido = PRESETS_DE_DIAS.find(
    (p) => p.dias.length === actual.dias.length && p.dias.every((d) => actual.dias.includes(d)),
  );
  const resumen = valor ? resumenDeHorario(valor) : "";

  return (
    <div className="flex flex-col gap-5">
      <GrupoDeOpciones titulo="¿Qué días atiende tu equipo?">
        {PRESETS_DE_DIAS.map((p) => (
          <FichaUnica
            key={p.id}
            nombre="horario-preset"
            valor={p.id}
            elegida={presetElegido?.id === p.id}
            onElegir={() => onCambiar({ ...actual, dias: p.dias })}
          >
            {p.titulo}
          </FichaUnica>
        ))}
      </GrupoDeOpciones>
      <GrupoDeOpciones titulo="Ajusta los días" className="gap-1.5">
        {DIAS.map((dia, i) => (
          <FichaMultiple
            key={dia}
            elegida={actual.dias.includes(i)}
            onCambiar={(on) =>
              onCambiar({ ...actual, dias: on ? [...actual.dias, i].sort((a, b) => a - b) : actual.dias.filter((d) => d !== i) })
            }
          >
            {dia}
          </FichaMultiple>
        ))}
      </GrupoDeOpciones>
      <GrupoDeOpciones titulo="¿En qué horas?">
        {BLOQUES_DE_HORAS.map((b) => (
          <FichaUnica
            key={b.id}
            nombre="horario-bloque"
            valor={b.id}
            elegida={actual.bloque === b.id}
            onElegir={() => onCambiar({ ...actual, bloque: b.id })}
          >
            {b.id === "todo" ? b.titulo : `${b.titulo} · ${hora(b.desde)} a ${hora(b.hasta)}`}
          </FichaUnica>
        ))}
      </GrupoDeOpciones>
      <p className="text-sm text-body" aria-live="polite">
        {resumen ? (
          <>
            Tu equipo atiende: <span className="font-medium text-headline">{resumen}</span>. Tu agente responde siempre.
          </>
        ) : (
          "Sin horario: el agente no mencionará cuándo atiende tu equipo."
        )}
      </p>
      {valor && (
        <button type="button" onClick={() => onCambiar(null)} className="self-start text-sm text-link underline underline-offset-2">
          Prefiero no definir un horario
        </button>
      )}
    </div>
  );
}
