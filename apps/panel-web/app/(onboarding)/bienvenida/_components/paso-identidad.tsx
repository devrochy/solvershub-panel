"use client";

import { Field } from "@/components/ui/field";
import { FichaUnica, GrupoDeOpciones } from "@/components/ui/elegibles";
import { Input } from "@/components/ui/input";
import { NOMBRE_AGENTE_MAX, TIPOS_DE_NEGOCIO, type EstadoDelAsistente } from "@/lib/onboarding";

/** Paso 2 de la bienvenida (SPEC-47): cómo se llama el agente, con ideas de nombre según el tipo de negocio. */
export function PasoIdentidad({
  estado,
  onCambiar,
}: {
  estado: EstadoDelAsistente;
  onCambiar: (cambios: Partial<EstadoDelAsistente>) => void;
}) {
  const tipo = TIPOS_DE_NEGOCIO.find((t) => t.id === estado.tipo);
  return (
    <div className="flex max-w-xl flex-col gap-5">
      <Field label="Nombre de tu agente" htmlFor="onb-agente" required help="Así se presenta a tus clientes.">
        <Input
          id="onb-agente"
          value={estado.nombreDelAgente}
          maxLength={NOMBRE_AGENTE_MAX}
          onChange={(e) => onCambiar({ nombreDelAgente: e.target.value })}
        />
      </Field>
      {tipo && (
        <GrupoDeOpciones titulo="Ideas de nombre">
          {tipo.nombres.map((n) => (
            <FichaUnica
              key={n}
              nombre="nombre-sugerido"
              valor={n}
              elegida={estado.nombreDelAgente === n}
              onElegir={(v) => onCambiar({ nombreDelAgente: v })}
            >
              {n}
            </FichaUnica>
          ))}
        </GrupoDeOpciones>
      )}
    </div>
  );
}
