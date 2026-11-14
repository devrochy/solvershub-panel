"use client";

import { ChatPrueba } from "@/app/(app)/asistente/_components/chat-prueba";
import { sugerenciasDePrueba } from "@/lib/carga-de-datos";
import { FRASES_DE_PRUEBA, type EstadoDelAsistente } from "@/lib/onboarding";

/**
 * Paso 6: el dueño le escribe a su agente nuevo. La prueba corre por la conexión de pruebas donde quedó
 * publicado (HU-AOS-57), con frases para empezar con un toque. «Terminar» se habilita con la primera respuesta.
 */
export function PasoProbar({
  estado,
  conexionId,
  onRespuesta,
  cargados = [],
}: {
  estado: EstadoDelAsistente;
  conexionId: string | null;
  onRespuesta: () => void;
  /** Lo cargado en el paso anterior (SPEC-45): sus nombres van primero en las frases sugeridas. */
  cargados?: { tipo: string; nombre: string }[];
}) {
  if (!conexionId) {
    return (
      <p role="status" className="max-w-xl rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm text-body">
        Tu agente todavía no está listo para probar. Vuelve al paso anterior y créalo.
      </p>
    );
  }
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <p className="text-body">
        Escríbele como si fueras un cliente. Esta prueba no envía nada por WhatsApp, no cuenta en tus conversaciones y no crea pedidos, clientes ni citas.
      </p>
      <ChatPrueba
        conexionId={conexionId}
        sugerencias={sugerenciasDe(cargados, estado.tipo ? FRASES_DE_PRUEBA[estado.tipo] : undefined)}
        alRecibirRespuesta={onRespuesta}
      />
    </div>
  );
}

/** Frases con lo cargado primero y después las del tipo de negocio, sin repetir. */
function sugerenciasDe(cargados: { tipo: string; nombre: string }[], delTipo: string[] | undefined): string[] | undefined {
  const propias = sugerenciasDePrueba(cargados);
  if (propias.length === 0) return delTipo;
  return [...new Set([...propias, ...(delTipo ?? [])])].slice(0, 6);
}
