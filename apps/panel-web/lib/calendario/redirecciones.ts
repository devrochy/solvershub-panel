/**
 * Agenda es una sola vista (HU-CAL-08): las pestañas viejas (`/calendario/citas|tipos|horario|
 * bloqueos`) redirigen a `/calendario`, abriendo el cajón de ajustes donde correspondía. Los
 * enlaces guardados, las notificaciones y la app móvil siguen funcionando.
 */

export type SeccionVieja = "citas" | "tipos" | "horario" | "bloqueos";
type Query = Record<string, string | string[] | undefined>;

/** Sección del cajón de ajustes que reemplaza a cada pestaña (`null` = solo la vista). */
const AJUSTES: Record<SeccionVieja, string | null> = {
  citas: null,
  tipos: "tipos",
  horario: "horario",
  bloqueos: null,
};

/** Destino de una ruta vieja conservando los `searchParams` (`?tenant=`, `?google=`…). */
export function destinoDeRutaVieja(seccion: SeccionVieja, query: Query = {}): string {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(query)) {
    if (valor === undefined) continue;
    for (const v of Array.isArray(valor) ? valor : [valor]) params.append(clave, v);
  }
  const ajustes = AJUSTES[seccion];
  if (ajustes && !params.has("ajustes")) params.set("ajustes", ajustes);
  const cadena = params.toString();
  return cadena ? `/calendario?${cadena}` : "/calendario";
}
