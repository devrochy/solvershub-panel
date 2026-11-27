import { useId, type ReactNode } from "react";
import Link from "next/link";

import { Switch } from "@/components/ui/switch";
import type { PublishTarget } from "@/lib/api/types";
import { sugerenciasDePrueba } from "@/lib/carga-de-datos";
import { canalLabel, habilidadLabel } from "@/lib/labels";
import { creditosEnPalabras, NIVELES_IA, type NivelIa } from "@/lib/nivel-ia";
import { FRASES_DE_PRUEBA, type TipoDeNegocio } from "@/lib/onboarding";

import type { PreguntaDeLaLista } from "./pregunta-del-recorrido";

/** La línea de «Opciones avanzadas» de la estación 5 (decisión del dueño, 2026-11-27): solo el nivel de IA. */
export const AVANZADAS_DE_REVISAR = "El nivel de IA con que responde.";

/** «Escribe aquí para probar a Laura»: el aviso del celular en la última prueba (tablero `E5S`). */
export function avisoDeLaPrueba(nombre: string): string {
  return `Escribe aquí para probar a ${nombre}`;
}

/** Las frases de la última prueba: lo cargado en «Datos para probar» primero y después las del tipo, sin repetir. */
export function frasesDeLaUltimaPrueba(
  cargados: readonly { tipo: string; nombre: string }[],
  tipo: TipoDeNegocio | null | undefined,
): string[] {
  return [...new Set([...sugerenciasDePrueba([...cargados]), ...(tipo ? FRASES_DE_PRUEBA[tipo] : [])])].slice(0, 3);
}

/** Nombre visible de una conexión de «Dónde atiende». */
export function nombreDeLaConexion(d: Pick<PublishTarget, "label" | "channel">): string {
  return d.label || canalLabel(d.channel);
}

/**
 * El nivel de IA en «Opciones avanzadas» de la estación 5: el actual con su gasto aproximado, lo que trae el plan y
 * «Cambiar». Se cambia en la ficha del agente (Consumo), no aquí: el cambio corre al publicar y puede chocar con el
 * plan (409). Sin `hrefCambiar` (la bienvenida, donde el panel no se abre hasta terminar) «Cambiar» va como texto.
 */
export function LineaDelNivelDeIa({
  nivel,
  incluyeAvanzado,
  hrefCambiar,
}: {
  nivel: NivelIa;
  /** `null`: el plan no se pudo leer, y no se dice qué trae. */
  incluyeAvanzado: boolean | null;
  hrefCambiar?: string;
}) {
  const idTitulo = useId();
  const actual = NIVELES_IA.find((n) => n.value === nivel) ?? NIVELES_IA[0];
  const delPlan =
    incluyeAvanzado === null
      ? null
      : incluyeAvanzado
        ? "Tu plan incluye Estándar y Avanzado."
        : "Tu plan incluye Estándar. Avanzado viene en Premium y Empresarial.";
  return (
    <section aria-labelledby={idTitulo} className="flex flex-col gap-1">
      <h3 id={idTitulo} className="font-display text-base font-semibold text-headline">
        Nivel de IA
      </h3>
      <p className="text-sm text-body">
        Responde con el nivel <span className="font-medium text-headline">{actual.label}</span> ·{" "}
        {creditosEnPalabras(actual.value)}.{" "}
        {hrefCambiar ? (
          <Link href={hrefCambiar} className="font-medium text-link underline-offset-2 hover:underline">
            Cambiar
          </Link>
        ) : (
          "Lo cambias después en la ficha del agente, en Consumo."
        )}
      </p>
      {delPlan && <p className="text-sm text-text-soft">{delPlan}</p>}
    </section>
  );
}

/** Una fila de «¿Dónde atiende?»: el canal, qué es y su control (interruptor, «Encendido» o un enlace). */
function FilaDeCanal({ titulo, descripcion, control }: { titulo: string; descripcion: ReactNode; control?: ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border-soft bg-surface px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-semibold text-headline">{titulo}</p>
        <p className="text-sm text-text-soft">{descripcion}</p>
      </div>
      {control}
    </li>
  );
}

export type CanalesDeLaRevision =
  | {
      /** Nuevo agente: las conexiones de `publish-targets`, con interruptor. */
      tipo: "conexiones";
      destinos: readonly PublishTarget[];
      destinosError: string | null;
      elegidas: readonly string[];
      alternar: (id: string, activo: boolean) => void;
      error?: string;
    }
  | {
      /** La bienvenida (D-SPEC-52-10): informativa, sin backend. */
      tipo: "informativa";
    };

/**
 * Las preguntas de la estación 5, una a la vez (HU-UX-31, tablero `E5S`): «¿Todo quedó como querías?» con el
 * resumen y lo que queda por configurar, «Hazle una última prueba» en el celular y «¿Dónde atiende {nombre}?».
 *
 * La prueba se exige solo en la bienvenida (`pruebaExigida`), donde sin ella no se puede terminar (`finalizar`); en
 * Nuevo agente se publica como hoy, con o sin prueba. En la bienvenida «¿Dónde atiende?» es informativa: Chat web
 * encendido y WhatsApp como texto, sin enlace (el panel no se abre hasta terminar).
 */
export function preguntasDeRevisar({
  nombre,
  revision,
  pendientes,
  prueba,
  canales,
}: {
  nombre: string;
  /** El resumen de las estaciones y lo que queda por configurar después. */
  revision: ReactNode;
  /** Cuántas cosas quedan por configurar después (para la línea de la respondida). */
  pendientes: number;
  prueba: {
    /** Mensajes del dueño en esta visita. */
    mensajes: number;
    /** Ya le escribió y le contestó (en la bienvenida lo recuerda el recorrido). */
    probado: boolean;
    exigida: boolean;
    /** Lo que va en la tarjeta: dónde escribir y cómo va. */
    contenido: ReactNode;
  };
  canales: CanalesDeLaRevision;
}): PreguntaDeLaLista[] {
  const deLaRevision: PreguntaDeLaLista = {
    id: "revision",
    titulo: "¿Todo quedó como querías?",
    ayuda: "Esto es lo que configuraste. Cambia cualquier estación sin perder lo demás.",
    respuesta:
      pendientes > 0 ? `Revisado · ${pendientes} ${pendientes === 1 ? "cosa" : "cosas"} por configurar después` : "Revisado",
    contenido: revision,
  };

  const deLaPrueba: PreguntaDeLaLista = {
    id: "prueba",
    titulo: "Hazle una última prueba",
    ayuda: "Escríbele en el celular de vista previa como lo haría un cliente. Te responde ahí mismo.",
    respuesta:
      prueba.mensajes > 0
        ? `${prueba.mensajes} ${prueba.mensajes === 1 ? "mensaje" : "mensajes"} de prueba`
        : prueba.probado
          ? "Ya le escribiste"
          : "Sin probar",
    puedeContinuar: !prueba.exigida || prueba.probado,
    contenido: prueba.contenido,
  };

  let deLosCanales: PreguntaDeLaLista;
  if (canales.tipo === "informativa") {
    deLosCanales = {
      id: "canales",
      titulo: `¿Dónde atiende ${nombre}?`,
      ayuda: "Al terminar, queda atendiendo en tu chat de pruebas. Los demás canales los sumas después.",
      respuesta: "Chat web",
      contenido: (
        <ul className="flex flex-col gap-2" aria-label="Canales">
          <FilaDeCanal
            titulo="Chat web"
            descripcion="Tu chat de pruebas: solo tú lo ves, cerrado al público."
            control={<span className="shrink-0 text-sm font-medium text-status-success-fg">Encendido</span>}
          />
          <FilaDeCanal titulo="WhatsApp" descripcion="Lo conectas después de terminar, en Conexiones." />
        </ul>
      ),
    };
  } else {
    const { destinos, destinosError, elegidas, alternar, error } = canales;
    const elegidosVisibles = destinos.filter((d) => elegidas.includes(d.connection_id)).map(nombreDeLaConexion);
    const conWhatsApp = destinos.some((d) => d.channel === "whatsapp");
    deLosCanales = {
      id: "canales",
      titulo: `¿Dónde atiende ${nombre}?`,
      ayuda: "Al publicar, queda activo en los canales encendidos. Puedes sumar más después.",
      respuesta: elegidosVisibles.length > 0 ? elegidosVisibles.join(" y ") : "Ningún canal",
      puedeContinuar: elegidas.length > 0,
      contenido: (
        <div className="flex flex-col gap-2">
          {destinosError && (
            <p role="alert" className="text-sm text-status-danger-fg">
              No se pudieron cargar las conexiones: {destinosError}
            </p>
          )}
          <ul className="flex flex-col gap-2" aria-label="Canales">
            {destinos.map((d) => {
              const titulo = nombreDeLaConexion(d);
              return (
                <FilaDeCanal
                  key={d.connection_id}
                  titulo={titulo}
                  descripcion={
                    d.covers_skills
                      ? d.label
                        ? canalLabel(d.channel)
                        : "Tus clientes le escriben por aquí."
                      : `Le faltan habilidades: ${d.missing_skills.map(habilidadLabel).join(", ")}.`
                  }
                  control={
                    <Switch
                      checked={elegidas.includes(d.connection_id)}
                      disabled={!d.covers_skills}
                      onCheckedChange={(activo) => alternar(d.connection_id, activo)}
                      aria-label={`Atiende en ${titulo}`}
                    />
                  }
                />
              );
            })}
            {!conWhatsApp && (
              <FilaDeCanal
                titulo="WhatsApp"
                descripcion="Aún no hay un número conectado."
                control={
                  <Link href="/conexiones" className="shrink-0 text-sm font-medium text-link underline-offset-2 hover:underline">
                    Conectar en Conexiones
                  </Link>
                }
              />
            )}
          </ul>
          {destinos.length === 0 && !destinosError && (
            <p className="text-sm text-body">Conecta un canal en Conexiones y vuelve aquí para publicar.</p>
          )}
          {error && (
            <p role="alert" className="text-sm text-status-danger-fg">
              {error}
            </p>
          )}
        </div>
      ),
    };
  }

  return [deLaRevision, deLaPrueba, deLosCanales];
}
