/**
 * Datos de prueba por agente (HU-QA-10, ADR-0146): textos del resumen de un lote y llamadas del
 * navegador al BFF `/api/agentes/{id}/datos-de-prueba`. Solo existe en test: fuera de test la API
 * responde 404 y el panel no muestra el botón.
 */

/** Tipos que se cuentan en el resumen, en orden, con su singular y plural. Los demás (variantes,
 * cuotas, pagos, bloqueos) son detalle de estos y no se nombran. */
const TIPOS: [string, string, string][] = [
  ["producto", "producto", "productos"],
  ["categoria", "categoría", "categorías"],
  ["tipo", "tipo de cita", "tipos de cita"],
  ["cita", "cita", "citas"],
  ["cartera", "cartera", "carteras"],
  ["cliente", "cliente", "clientes"],
  ["prestamo", "préstamo", "préstamos"],
];

function lista(partes: string[]): string {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

/** «12 productos y 3 categorías», o «sin registros nuevos». */
export function conteoLegible(conteos: Record<string, number>): string {
  const partes = TIPOS.filter(([k]) => (conteos[k] ?? 0) > 0).map(([k, uno, varios]) => {
    const n = conteos[k] ?? 0;
    return `${n} ${n === 1 ? uno : varios}`;
  });
  return partes.length ? lista(partes) : "sin registros nuevos";
}

/** Aviso al terminar una generación. */
export function resumenDelLote(lote: {
  conteos: Record<string, number>;
  origen: "llm" | "plantilla";
  motivo_plantilla?: "proveedor" | "formato" | null;
}): string {
  const que = conteoLegible(lote.conteos);
  if (lote.origen === "llm") return `Listo: ${que}, generados con IA según tu negocio.`;
  const porque =
    lote.motivo_plantilla === "formato"
      ? "la IA no devolvió datos válidos"
      : "la IA no respondió";
  return `Listo: ${que}, con la plantilla de ejemplo porque ${porque}.`;
}

export const IR_A_IDENTIDAD = "/configuracion?tab=identidad";

export type Respuesta<T> = { ok: true; data: T } | { ok: false; error: string; code?: string; status: number };

export async function llamarDatosDePrueba<T>(
  agenteId: string,
  method: "GET" | "POST" | "DELETE",
): Promise<Respuesta<T>> {
  try {
    const res = await fetch(`/api/agentes/${agenteId}/datos-de-prueba`, { method });
    const json = (await res.json().catch(() => null)) as (T & { error?: unknown; code?: unknown }) | null;
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: json && typeof json.error === "string" ? json.error : "No se pudo completar la acción.",
        ...(json && typeof json.code === "string" ? { code: json.code } : {}),
      };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "Sin conexión con el servidor.", status: 0 };
  }
}
