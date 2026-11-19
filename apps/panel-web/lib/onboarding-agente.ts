/**
 * Crear el agente de la bienvenida y dejarlo listo para probar (SPEC-47, antes el paso «Crea tu agente»).
 * Corre al salir de «Horario y reglas» y, otra vez, antes de «Pruébalo» y al terminar, para que la prueba
 * y la versión final usen lo último que el dueño configuró. Las dos llamadas del servidor son idempotentes.
 */
import { plantillaDe, respuestasDeCreacion, type EstadoDelAsistente, type Recorrido, type SubPaso } from "@/lib/onboarding";

export type DejarListo = { conexion_id: string; listo: boolean; pasos: SubPaso[]; recorrido: Recorrido };

type Respuesta<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

async function enviar<T>(url: string, cuerpo: unknown): Promise<Respuesta<T>> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
    const json = (await res.json().catch(() => ({}))) as T & { error?: string; code?: string };
    if (!res.ok) return { ok: false, error: typeof json.error === "string" ? json.error : "Algo salió mal. Inténtalo de nuevo.", code: json.code };
    return { ok: true, data: json };
  } catch {
    return { ok: false, error: "No se pudo contactar el servidor." };
  }
}

/** Mensaje para el dueño de un error de `dejar-listo`. */
export function textoDeErrorAlDejarListo(error: { error: string; code?: string }): string {
  return error.code === "canal_en_vivo"
    ? "Ya tienes un chat web en vivo. Para no tocarlo, termina estos pasos más tarde desde Agentes o pausa ese chat."
    : error.error;
}

/** Publica el agente en el chat de pruebas cerrado y deja activa su versión (idempotente). */
export async function dejarListo(agenteId: string): Promise<Respuesta<DejarListo>> {
  return enviar<DejarListo>("/api/onboarding/dejar-listo", { agent_id: agenteId });
}

/**
 * Crea el agente con lo decidido (si aún no existe) y lo deja listo. Devuelve el id del agente y lo que
 * respondió `dejar-listo`, o el error para mostrar.
 */
export async function crearYDejarListo(
  estado: EstadoDelAsistente,
  agenteId: string | null,
): Promise<{ ok: true; agenteId: string; listo: DejarListo } | { ok: false; error: string }> {
  let agente = agenteId;
  if (agente) {
    // Volvió a «Tu negocio» con el agente ya creado: el nombre lo manda esta estación (HU-UX-25).
    const nombre = estado.nombreDelAgente.trim();
    if (nombre) {
      const renombrado = await fetch(`/api/agent-editor/${agente}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nombre }),
      }).catch(() => null);
      if (!renombrado?.ok) return { ok: false, error: "No se pudo cambiar el nombre de tu agente. Inténtalo de nuevo." };
    }
  } else {
    if (!estado.tipo) return { ok: false, error: "Elige a qué se dedica tu negocio." };
    const creado = await enviar<{ agentId: string }>("/api/agent-editor/from-script", {
      template_key: plantillaDe(estado.tipo),
      answers: respuestasDeCreacion(estado),
      name: estado.nombreDelAgente.trim(),
    });
    if (!creado.ok) return { ok: false, error: creado.error };
    agente = creado.data.agentId;
  }
  const listo = await dejarListo(agente);
  if (!listo.ok) return { ok: false, error: textoDeErrorAlDejarListo(listo) };
  return { ok: true, agenteId: agente, listo: listo.data };
}
