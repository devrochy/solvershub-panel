/**
 * Rutas del agente (SPEC-47, HU-AOS-80, D-SPEC-47-3). Personalizar es la ruta canónica del editor;
 * `/agentes/[id]/editar` redirige aquí conservando la query (`?paso=publicar`, `?modo=crear`).
 */

export function rutaDePersonalizar(agenteId: string, query: Record<string, string | undefined> = {}): string {
  const qs = new URLSearchParams();
  for (const [clave, valor] of Object.entries(query)) if (valor) qs.set(clave, valor);
  const s = qs.toString();
  return `/agentes/${agenteId}/personalizar${s ? `?${s}` : ""}`;
}

/** La misma query, para el redirect de la ruta vieja: solo valores de texto, en su orden. */
export function queryParaRedirigir(params: Record<string, string | string[] | undefined>): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(params)) {
    const v = Array.isArray(valor) ? valor[0] : valor;
    if (typeof v === "string" && v) salida[clave] = v;
  }
  return salida;
}
