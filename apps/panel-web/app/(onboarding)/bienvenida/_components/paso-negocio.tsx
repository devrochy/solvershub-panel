"use client";

import { CalendarCheck, HandCoins, Repeat, ShoppingBag } from "lucide-react";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { habilidadLabel } from "@/lib/labels";
import {
  DESCRIPCION_MAX,
  NOMBRE_AGENTE_MAX,
  OPCIONES_QUE_VENDE,
  TIPOS_DE_NEGOCIO,
  type EstadoDelAsistente,
  type QueVende,
  type TipoDeNegocio,
} from "@/lib/onboarding";

import { FichaUnica, GrupoDeOpciones, TarjetaElegible } from "./elegibles";

const ICONOS: Record<TipoDeNegocio, React.ReactNode> = {
  ventas: <ShoppingBag className="h-6 w-6" />,
  agenda: <CalendarCheck className="h-6 w-6" />,
  cobranza: <HandCoins className="h-6 w-6" />,
  suscripciones: <Repeat className="h-6 w-6" />,
};

/** Paso 1: a qué se dedica el negocio (tipo de agente), una frase y cómo se llama el agente. */
export function PasoNegocio({
  estado,
  onCambiar,
  disponibles,
  habilitara,
}: {
  estado: EstadoDelAsistente;
  onCambiar: (cambios: Partial<EstadoDelAsistente>) => void;
  /** Tipos que este servicio puede ofrecer; si no se conoce, todos. */
  disponibles: ReadonlySet<TipoDeNegocio> | null;
  /** Habilidades que se activarán al crear el agente de cada tipo. */
  habilitara: Partial<Record<TipoDeNegocio, string[]>>;
}) {
  const tipo = TIPOS_DE_NEGOCIO.find((t) => t.id === estado.tipo);
  const porActivar = (estado.tipo && habilitara[estado.tipo]) || [];
  return (
    <div className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-3">
        <legend className="font-display text-base font-semibold text-headline">¿A qué se dedica tu negocio?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {TIPOS_DE_NEGOCIO.map((t) => {
            const lista = !disponibles || disponibles.has(t.id);
            return (
              <TarjetaElegible
                key={t.id}
                nombre="tipo-de-negocio"
                valor={t.id}
                elegida={estado.tipo === t.id}
                deshabilitada={!lista}
                onElegir={() => onCambiar({ tipo: t.id, nombreDelAgente: estado.nombreDelAgente || t.nombres[0] })}
                titulo={t.titulo}
                ayuda={lista ? t.ayuda : "Este tipo no está disponible en tu servicio por ahora."}
                icono={ICONOS[t.id]}
              />
            );
          })}
        </div>
        {porActivar.length > 0 && (
          <p className="text-sm text-body" aria-live="polite">
            Al terminar activaremos por ti: <span className="text-headline">{porActivar.map(habilidadLabel).join(", ")}</span>.
            Podrás configurarla después en Habilidades.
          </p>
        )}
      </fieldset>

      {estado.tipo === "ventas" && (
        <GrupoDeOpciones titulo="¿Qué vendes?" ayuda="Así tu agente ofrece solo lo tuyo.">
          {OPCIONES_QUE_VENDE.map((o) => (
            <FichaUnica
              key={o.id}
              nombre="que-vendes"
              valor={o.id}
              elegida={estado.queVende === o.id}
              onElegir={(v) => onCambiar({ queVende: v as QueVende })}
            >
              {o.titulo}
            </FichaUnica>
          ))}
        </GrupoDeOpciones>
      )}

      <div className="flex max-w-xl flex-col gap-5">
        <Field label="Nombre de tu negocio" htmlFor="onb-negocio">
          <Input
            id="onb-negocio"
            value={estado.negocio}
            maxLength={80}
            autoComplete="organization"
            onChange={(e) => onCambiar({ negocio: e.target.value })}
          />
        </Field>
        <Field
          label="Cuéntanos en una frase a qué se dedica"
          htmlFor="onb-descripcion"
          help={`${estado.descripcion.length}/${DESCRIPCION_MAX}. Tu agente la usa para presentarse y responder.`}
          required
        >
          <Textarea
            id="onb-descripcion"
            rows={3}
            value={estado.descripcion}
            maxLength={DESCRIPCION_MAX}
            placeholder="Ej.: Vendemos ropa deportiva con envíos a todo el país"
            onChange={(e) => onCambiar({ descripcion: e.target.value })}
          />
        </Field>
        <Field label="Nombre de tu agente" htmlFor="onb-agente" required>
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
    </div>
  );
}
