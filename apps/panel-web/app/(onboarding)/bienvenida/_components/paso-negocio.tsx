"use client";

import { useId } from "react";

import { NombreSugerido } from "@/components/domain/agentes/recorrido/nombre-sugerido";
import { OpcionesAvanzadas } from "@/components/domain/agentes/recorrido/opciones-avanzadas";
import { ListaDePreguntas, type PreguntaDeLaLista } from "@/components/domain/agentes/recorrido/pregunta-del-recorrido";
import { GrupoDeOpciones, TarjetaElegible } from "@/components/ui/elegibles";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { habilidadLabel } from "@/lib/labels";
import {
  DESCRIPCION_MAX,
  ESTADO_INICIAL,
  LARGOS,
  TIPO_RECOMENDADO,
  TONOS,
  TIPOS_DE_NEGOCIO,
  fraseDelTipo,
  ideasDeLaBienvenida,
  type EstadoDelAsistente,
  type Largo,
  type TipoDeNegocio,
  type Tono,
} from "@/lib/onboarding";
import { errorDelNombre } from "@/lib/ruta-de-lanzamiento";

/** La línea visible de «Opciones avanzadas» de la estación 1 en la bienvenida (decisión del dueño, 2026-11-26). */
export const AVANZADAS_DE_LA_BIENVENIDA = "Largo de las respuestas, tono de voz y la frase de tu negocio.";

/** Las preguntas de la estación 1 de la bienvenida, en orden (tablero `E1-E-bienvenida`). */
export const PREGUNTAS_DE_LA_BIENVENIDA = ["tipo", "nombre", "negocio"] as const;

/**
 * Estación 1 de la bienvenida, «Tu negocio», una pregunta a la vez (HU-UX-27, SPEC-52, tablero `E1-E-bienvenida`):
 * «¿Qué hará tu agente?» (con «Vendo productos» recomendado), «¿Cómo se llama?» («Laura» sugerida, con ideas) y
 * «¿Cómo se llama tu negocio?». En «Opciones avanzadas» van el largo de las respuestas, el tono de voz (del negocio)
 * y la frase de a qué se dedica, sugerida por tipo. No pide ningún producto: eso va en «Datos para probar».
 *
 * Qué pregunta está abierta lo lleva quien la usa (`abierta`/`onAbrir`), para el pie y el borrador local. Elegir
 * un tipo lo hace `onTipo` (la frase sigue al tipo solo si el dueño no la editó).
 */
export function PasoNegocio({
  estado,
  onCambiar,
  onTipo,
  disponibles,
  tipoFijo = null,
  habilitara,
  abierta,
  onAbrir,
  avanzadasAbiertas,
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
  /** El índice de la pregunta abierta; 3 = todas respondidas. */
  abierta: number;
  onAbrir: (indice: number) => void;
  /** Abre «Opciones avanzadas» al montar (por ejemplo, si la frase tiene un error). */
  avanzadasAbiertas?: boolean;
}) {
  const id = useId();
  const porActivar = (estado.tipo && habilitara[estado.tipo]) || [];
  const recomendado = TIPOS_DE_NEGOCIO.find((t) => t.id === TIPO_RECOMENDADO);
  const tipo = TIPOS_DE_NEGOCIO.find((t) => t.id === estado.tipo);
  const fraseRecomendada = Boolean(estado.tipo) && estado.descripcion === fraseDelTipo(estado.tipo);
  const nombre = estado.nombreDelAgente.trim();
  const quien = nombre || "Tu agente";

  const preguntas: PreguntaDeLaLista[] = [
    {
      id: "tipo",
      titulo: "¿Qué hará tu agente?",
      ayuda: "Su trabajo principal. Activa las habilidades que necesita; las ajustas en el siguiente paso.",
      respuesta: tipo?.titulo ?? "Sin elegir",
      puedeContinuar: Boolean(tipo),
      contenido: (
        <div className="flex flex-col gap-3">
          <GrupoDeOpciones titulo="Tipo de agente" tituloOculto unica className="grid gap-3 sm:grid-cols-2">
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
          <div className="flex flex-col gap-1 text-sm text-text-soft" aria-live="polite">
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
        </div>
      ),
    },
    {
      id: "nombre",
      titulo: "¿Cómo se llama?",
      ayuda: "Un nombre de persona hace que la conversación se sienta cercana.",
      respuesta: nombre || "Sin nombre",
      puedeContinuar: errorDelNombre(estado.nombreDelAgente) === null,
      contenido: (
        <NombreSugerido
          valor={estado.nombreDelAgente}
          onCambiar={(n) => onCambiar({ nombreDelAgente: n })}
          ideas={ideasDeLaBienvenida(estado.tipo)}
        />
      ),
    },
    {
      id: "negocio",
      titulo: "¿Cómo se llama tu negocio?",
      ayuda: `${quien} lo dice al presentarse.`,
      respuesta: estado.negocio.trim() || "Sin nombre",
      puedeContinuar: estado.negocio.trim().length > 0,
      contenido: (
        <Field label="Nombre de tu negocio" htmlFor="onb-negocio" required>
          <Input
            id="onb-negocio"
            value={estado.negocio}
            maxLength={80}
            autoComplete="organization"
            onChange={(e) => onCambiar({ negocio: e.target.value })}
            className="max-w-sm"
          />
        </Field>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <ListaDePreguntas preguntas={preguntas} abierta={abierta} onAbrir={onAbrir} />

      <OpcionesAvanzadas descripcion={AVANZADAS_DE_LA_BIENVENIDA} abierta={avanzadasAbiertas}>
        <GrupoDeOpciones titulo="Largo de las respuestas" unica className="grid gap-3 sm:grid-cols-3">
          {LARGOS.map((l) => (
            <TarjetaElegible
              key={l.id}
              nombre={`${id}-largo`}
              valor={l.id}
              elegida={estado.largo === l.id}
              onElegir={(v) => onCambiar({ largo: v as Largo })}
              titulo={l.titulo}
              ayuda={l.ayuda}
              etiqueta={l.id === ESTADO_INICIAL.largo ? "Recomendado" : undefined}
              className="w-full"
            />
          ))}
        </GrupoDeOpciones>

        <GrupoDeOpciones
          titulo="Tono de voz"
          ayuda="Es la voz de tu negocio: la usan todos tus agentes. La cambias después en Configuración › Voz del negocio."
          unica
          className="grid gap-3 sm:grid-cols-2"
        >
          {TONOS.map((t) => (
            <TarjetaElegible
              key={t.id}
              nombre={`${id}-tono`}
              valor={t.id}
              elegida={estado.tono === t.id}
              onElegir={(v) => onCambiar({ tono: v as Tono })}
              titulo={t.titulo}
              ayuda={`«${t.muestra}»`}
              etiqueta={t.id === ESTADO_INICIAL.tono ? "Recomendado" : undefined}
              className="w-full"
            />
          ))}
        </GrupoDeOpciones>

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
              ? `Sugerida para tu tipo de negocio; ajústala a lo que vendes, tu zona y tu horario. ${quien} la usa para presentarse.`
              : `${estado.descripcion.length}/${DESCRIPCION_MAX}. ${quien} la usa para presentarse.`}
          </p>
        </div>
      </OpcionesAvanzadas>
    </div>
  );
}
