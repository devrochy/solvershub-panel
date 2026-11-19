"use client";

import { useId } from "react";

import { NombreSugerido } from "@/components/domain/agentes/recorrido/nombre-sugerido";
import { GrupoDeOpciones, TarjetaElegible } from "@/components/ui/elegibles";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { habilidadLabel } from "@/lib/labels";
import {
  DESCRIPCION_MAX,
  TIPO_RECOMENDADO,
  TIPOS_DE_NEGOCIO,
  fraseDelTipo,
  ideasDeLaBienvenida,
  type EstadoDelAsistente,
  type TipoDeNegocio,
} from "@/lib/onboarding";

/**
 * Estación 1 de la bienvenida, «Tu negocio» (HU-UX-25, tablero `rb1`): a qué se dedica (con «Vendo productos»
 * recomendado), el nombre del negocio, el del agente («Laura» sugerida, con ideas) y una frase sugerida por tipo.
 * No pide ningún producto: eso va en «Datos para probar». Elegir un tipo lo hace `onTipo` (la frase sigue al
 * tipo solo si el dueño no la editó).
 */
export function PasoNegocio({
  estado,
  onCambiar,
  onTipo,
  disponibles,
  tipoFijo = null,
  habilitara,
}: {
  estado: EstadoDelAsistente;
  onCambiar: (cambios: Partial<EstadoDelAsistente>) => void;
  onTipo: (tipo: TipoDeNegocio) => void;
  /** Tipos que este servicio puede ofrecer; si no se conoce, todos. */
  disponibles: ReadonlySet<TipoDeNegocio> | null;
  /** El tipo del agente ya creado: los demás no se eligen (un agente no cambia de tipo). */
  tipoFijo?: TipoDeNegocio | null;
  /** Habilidades que se activarán al crear el agente de cada tipo. */
  habilitara: Partial<Record<TipoDeNegocio, string[]>>;
}) {
  const id = useId();
  const porActivar = (estado.tipo && habilitara[estado.tipo]) || [];
  const recomendado = TIPOS_DE_NEGOCIO.find((t) => t.id === TIPO_RECOMENDADO);
  const fraseRecomendada = Boolean(estado.tipo) && estado.descripcion === fraseDelTipo(estado.tipo);
  const nombre = estado.nombreDelAgente.trim() || "Tu agente";
  return (
    <div className="flex flex-col gap-8">
      <GrupoDeOpciones
        titulo="¿A qué se dedica tu negocio?"
        unica
        className="grid gap-3 pt-2 sm:grid-cols-2"
      >
        {TIPOS_DE_NEGOCIO.map((t) => {
          const otroTipo = tipoFijo !== null && t.id !== tipoFijo;
          const lista = !otroTipo && (!disponibles || disponibles.has(t.id));
          const Icono = t.icono;
          return (
            <TarjetaElegible
              key={t.id}
              nombre={`${id}-tipo`}
              valor={t.id}
              elegida={estado.tipo === t.id}
              deshabilitada={!lista}
              nota={lista ? undefined : otroTipo ? "Tu agente ya está creado con otro tipo." : "No está en tu servicio por ahora."}
              onElegir={() => onTipo(t.id)}
              titulo={t.titulo}
              ayuda={t.ayuda}
              icono={<Icono className="h-5 w-5" />}
              baldosa
              etiqueta={t.id === TIPO_RECOMENDADO ? "Recomendado" : undefined}
              className="w-full"
            />
          );
        })}
      </GrupoDeOpciones>
      <div className="-mt-5 flex flex-col gap-1 text-sm text-text-soft" aria-live="polite">
        <p>
          {tipoFijo
            ? `Tu agente ya está creado como «${TIPOS_DE_NEGOCIO.find((t) => t.id === tipoFijo)?.titulo}».`
            : estado.tipo === TIPO_RECOMENDADO
              ? "Recomendado para negocios que venden productos."
              : `Lo recomendado es «${recomendado?.titulo}», para negocios que venden productos.`}
        </p>
        {porActivar.length > 0 && (
          <p className="text-body">
            Al terminar activaremos por ti: <span className="text-headline">{porActivar.map(habilidadLabel).join(", ")}</span>.
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Field label="Nombre de tu negocio" htmlFor="onb-negocio" required>
          <Input
            id="onb-negocio"
            value={estado.negocio}
            maxLength={80}
            autoComplete="organization"
            onChange={(e) => onCambiar({ negocio: e.target.value })}
          />
        </Field>
        <NombreSugerido
          valor={estado.nombreDelAgente}
          onCambiar={(n) => onCambiar({ nombreDelAgente: n })}
          ideas={ideasDeLaBienvenida(estado.tipo)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="onb-descripcion" className="flex items-center gap-2 text-sh-label text-headline">
          Cuéntanos en una frase a qué se dedica
          {fraseRecomendada && (
            <span className="rounded-full border border-focus px-2 text-xs font-semibold leading-5 text-link">Recomendado</span>
          )}
        </label>
        <Textarea
          id="onb-descripcion"
          rows={2}
          value={estado.descripcion}
          maxLength={DESCRIPCION_MAX}
          aria-describedby="onb-descripcion-ayuda"
          placeholder="Ej.: Pan artesanal y tortas por encargo, con domicilios en tu zona"
          onChange={(e) => onCambiar({ descripcion: e.target.value })}
        />
        <p id="onb-descripcion-ayuda" className="text-xs text-text-soft">
          {fraseRecomendada
            ? `Sugerida para tu tipo de negocio; ajústala a lo que vendes, tu zona y tu horario. ${nombre} la usa para presentarse.`
            : `${estado.descripcion.length}/${DESCRIPCION_MAX}. ${nombre} la usa para presentarse.`}
        </p>
      </div>
    </div>
  );
}
