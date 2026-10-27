"use client";

import {
  CALIDEZ_ETIQUETAS,
  CALIDEZ_MAX,
  CALIDEZ_MIN,
  EMOJIS,
  LARGOS,
  TONOS,
  type EstadoDelAsistente,
  type Emojis,
  type Largo,
  type Tono,
} from "@/lib/onboarding";

import { FichaUnica, GrupoDeOpciones, TarjetaElegible } from "./elegibles";

/** Paso 2: cuatro decisiones visuales de voz. La tarjeta del agente reescribe su burbuja al instante. */
export function PasoVoz({
  estado,
  onCambiar,
}: {
  estado: EstadoDelAsistente;
  onCambiar: (cambios: Partial<EstadoDelAsistente>) => void;
}) {
  const niveles = Array.from({ length: CALIDEZ_MAX - CALIDEZ_MIN + 1 }, (_, i) => CALIDEZ_MIN + i);
  return (
    <div className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-3">
        <legend className="font-display text-base font-semibold text-headline">Tono</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {TONOS.map((t) => (
            <TarjetaElegible
              key={t.id}
              nombre="tono"
              valor={t.id}
              elegida={estado.tono === t.id}
              onElegir={(v) => onCambiar({ tono: v as Tono })}
              titulo={t.titulo}
              ayuda={`«${t.muestra}»`}
            />
          ))}
        </div>
      </fieldset>

      <GrupoDeOpciones titulo="Calidez" ayuda="Qué tan afectuoso es el trato.">
        {niveles.map((n) => (
          <FichaUnica
            key={n}
            nombre="calidez"
            valor={String(n)}
            elegida={estado.calidez === n}
            onElegir={(v) => onCambiar({ calidez: Number(v) })}
          >
            {n === CALIDEZ_MIN || n === CALIDEZ_MAX || estado.calidez === n ? `${n} · ${CALIDEZ_ETIQUETAS[n - 1]}` : n}
          </FichaUnica>
        ))}
      </GrupoDeOpciones>

      <GrupoDeOpciones titulo="Emojis">
        {EMOJIS.map((e) => (
          <FichaUnica
            key={e.id}
            nombre="emojis"
            valor={e.id}
            elegida={estado.emojis === e.id}
            onElegir={(v) => onCambiar({ emojis: v as Emojis })}
          >
            {e.titulo}
          </FichaUnica>
        ))}
      </GrupoDeOpciones>

      <GrupoDeOpciones titulo="Largo de las respuestas">
        {LARGOS.map((l) => (
          <FichaUnica
            key={l.id}
            nombre="largo"
            valor={l.id}
            elegida={estado.largo === l.id}
            onElegir={(v) => onCambiar({ largo: v as Largo })}
          >
            {l.titulo} · {l.ayuda}
          </FichaUnica>
        ))}
      </GrupoDeOpciones>
    </div>
  );
}
