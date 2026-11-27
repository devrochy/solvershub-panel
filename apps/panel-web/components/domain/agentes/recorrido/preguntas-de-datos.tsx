"use client";

import Link from "next/link";
import { AlertCircle, Lock } from "lucide-react";

import type { PreguntaDeLaLista } from "@/components/domain/agentes/recorrido/pregunta-del-recorrido";
import { GrupoDeOpciones, TarjetaElegible } from "@/components/ui/elegibles";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { estadoDelAviso, type AvisoDatos } from "@/lib/aviso-datos";
import {
  METODOS_ENTREGA,
  NIVELES_EN_LA_RUTA,
  operacionesEnLaRuta,
  pistaDePiso,
  preguntaPorEntregas,
  resumenDeOperacion,
  type AccionPolitica,
  type AgenteDatos,
  type EstadoDatos,
  type MetodoEntrega,
  type NivelDato,
} from "@/lib/datos-cliente";

/** La ayuda de cada entrega en «¿Cómo entregas los pedidos?» (tablero `E3b`). */
const AYUDA_DE_ENTREGA: Record<MetodoEntrega, string> = {
  domicilio: "Llevas el pedido a la casa del cliente.",
  recoger_en_tienda: "El cliente pasa por el pedido al negocio.",
};

/** La línea de «Opciones avanzadas» de la estación 3 (decisión del dueño, 2026-11-26). */
export const AVANZADAS_DE_DATOS = "El aviso de tratamiento de datos.";

const RECUERDA = [
  { id: "si", titulo: "Sí, que lo recuerde", ayuda: "Consulta sus datos e historial: no vuelve a pedir lo que ya sabe." },
  { id: "no", titulo: "No por ahora", ayuda: "Pregunta los datos en cada conversación." },
] as const;

/**
 * Las preguntas de la estación 3 · Datos del cliente de la ruta (HU-UX-29, tableros `E3b` variante `porEntrega` y
 * `E3-L-nuevo`), para `ListaDePreguntas`:
 * 1. «¿Cómo entregas los pedidos?»: solo si el agente vende con entrega; no deja seguir sin ninguna;
 * 2. una por operación visible (`operacionesEnLaRuta`): «A domicilio · ¿Qué datos pide?» por cada entrega encendida,
 *    o «¿Qué datos pide para agendar una cita?» en los otros tipos. Cada dato con Siempre, Si se puede y No; los que
 *    exige el sistema, con candado;
 * 3. «¿Recuerda a quien ya te escribió?» (`herramientas_del_agente`).
 *
 * Solo la primera cambia cuántas preguntas hay, y solo mientras está abierta: el índice de las demás no se mueve.
 * Lo elegido lo guarda el editor al seguir (`PUT /datos-cliente`).
 */
export function preguntasDeDatos({
  nombre,
  politica,
  estado,
  metodos,
  herramientas,
  onNivel,
  onMetodo,
  onHerramientas,
  error,
}: {
  nombre: string;
  politica: AgenteDatos;
  estado: EstadoDatos;
  metodos: readonly MetodoEntrega[];
  herramientas: boolean;
  onNivel: (accionId: string, clave: string, nivel: NivelDato) => void;
  onMetodo: (metodo: MetodoEntrega, activo: boolean) => void;
  onHerramientas: (activo: boolean) => void;
  /** El error de las entregas (ninguna encendida). */
  error?: string;
}): PreguntaDeLaLista[] {
  const quien = nombre || "tu agente";
  const entregas: PreguntaDeLaLista | null = preguntaPorEntregas(politica)
    ? {
        id: "entregas",
        titulo: "¿Cómo entregas los pedidos?",
        ayuda: "Por cada forma que marques te preguntamos qué datos pide.",
        respuesta: METODOS_ENTREGA.filter((m) => metodos.includes(m.id)).map((m) => m.etiqueta).join(" y ") || "Nada marcado",
        puedeContinuar: metodos.length > 0,
        contenido: (
          <div className="flex flex-col gap-3">
            <GrupoDeOpciones titulo="Formas de entrega" tituloOculto className="grid gap-3 sm:grid-cols-2">
              {METODOS_ENTREGA.map((m) => {
                const encendida = metodos.includes(m.id);
                return (
                  <TarjetaElegible
                    key={m.id}
                    multiple
                    nombre={`entrega-${m.id}`}
                    valor={m.id}
                    elegida={encendida}
                    onElegir={() => onMetodo(m.id, !encendida)}
                    titulo={m.etiqueta}
                    ayuda={AYUDA_DE_ENTREGA[m.id]}
                    className="w-full"
                  />
                );
              })}
            </GrupoDeOpciones>
            {(error || metodos.length === 0) && (
              <p role="alert" className="flex items-start gap-1.5 text-sm text-status-danger-fg">
                <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                {error ?? "Marca al menos una para que pueda cerrar pedidos."}
              </p>
            )}
          </div>
        ),
      }
    : null;

  const datos = operacionesEnLaRuta(politica, metodos).map(
    ({ accion, entrega, titulo }): PreguntaDeLaLista => ({
      id: `datos-${accion.id}`,
      titulo,
      ayuda: entrega
        ? `Viene con lo justo para ${entrega === "domicilio" ? "entregar a domicilio" : "que recojan en tienda"}. Ajusta cada dato.`
        : "Viene con lo justo. Ajusta cada dato.",
      respuesta: resumenDeOperacion(accion, estado),
      contenido: <DatosDeLaOperacion accion={accion} estado={estado[accion.id] ?? {}} onNivel={onNivel} />,
    }),
  );

  const recuerda: PreguntaDeLaLista = {
    id: "recuerda",
    titulo: "¿Recuerda a quien ya te escribió?",
    ayuda: `Si lo recuerda, ${quien} no le vuelve a pedir los mismos datos.`,
    respuesta: herramientas ? "Sí, consulta sus datos e historial" : "No por ahora",
    contenido: (
      <GrupoDeOpciones unica titulo="¿Recuerda a quien ya te escribió?" tituloOculto className="grid gap-3 sm:grid-cols-2">
        {RECUERDA.map((r) => (
          <TarjetaElegible
            key={r.id}
            nombre="recuerda"
            valor={r.id}
            elegida={(r.id === "si") === herramientas}
            onElegir={(valor) => onHerramientas(valor === "si")}
            titulo={r.titulo}
            ayuda={r.ayuda}
            className="w-full"
          />
        ))}
      </GrupoDeOpciones>
    ),
  };

  return [...(entregas ? [entregas] : []), ...datos, recuerda];
}

/** Los datos de una operación, cada uno con su nivel (tablero `E3b`, `esDatosEntrega`). */
function DatosDeLaOperacion({
  accion,
  estado,
  onNivel,
}: {
  accion: AccionPolitica;
  estado: Record<string, NivelDato>;
  onNivel: (accionId: string, clave: string, nivel: NivelDato) => void;
}) {
  const opciones = NIVELES_EN_LA_RUTA.map((n) => ({ value: n.id, label: n.etiqueta }));
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-border-soft rounded-md border border-border-soft px-4">
        {accion.campos.map((campo) => {
          const nivel = estado[campo.clave] ?? campo.nivel;
          return (
            <li key={campo.clave} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-headline">{campo.etiqueta}</p>
                {!campo.ajustable && (
                  <p className="flex items-center gap-1 text-xs text-text-soft">
                    <Lock aria-hidden className="h-3 w-3" />
                    {pistaDePiso(accion)}
                  </p>
                )}
              </div>
              {campo.ajustable ? (
                <SegmentedControl
                  label={`${campo.etiqueta}: cuándo lo pide`}
                  options={opciones}
                  value={nivel}
                  onChange={(valor) => onNivel(accion.id, campo.clave, valor as NivelDato)}
                  className="w-full shrink-0 sm:w-72"
                />
              ) : (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-md border border-border-soft px-3 py-1.5 text-sm font-medium text-headline">
                  <Lock aria-hidden className="h-3.5 w-3.5" />
                  {NIVELES_EN_LA_RUTA.find((n) => n.id === nivel)?.etiqueta ?? "Siempre"}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-text-soft">
        {NIVELES_EN_LA_RUTA.map((n) => `${n.etiqueta}: ${n.ayuda.charAt(0).toLocaleLowerCase("es-CO")}${n.ayuda.slice(1)}`).join(" · ")}
      </p>
    </div>
  );
}

/**
 * El aviso de tratamiento de datos en «Opciones avanzadas» de la estación 3 (decisión del dueño, 2026-11-26): el
 * texto que el agente muestra antes de pedir datos personales. Una línea con su estado; en Nuevo agente con
 * «Cambiar en Configuración» y en la bienvenida como texto, porque el panel no se abre hasta terminar.
 */
export function LineaDelAviso({ aviso, conEnlace }: { aviso: AvisoDatos; conEnlace: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-display text-base font-semibold text-headline">Aviso de tratamiento de datos</p>
      <p className="text-sm text-body">
        {estadoDelAviso(aviso)}{" "}
        {conEnlace ? (
          <Link
            href="/configuracion?seccion=datos-cliente"
            className="text-link underline-offset-2 hover:underline"
            aria-label="Cambiar el aviso de tratamiento de datos en Configuración"
          >
            Cambiar en Configuración
          </Link>
        ) : (
          "Lo cambias después en Configuración."
        )}
      </p>
    </div>
  );
}
