/** Escenarios de datos de prueba (HU-QA-13): reglas puras de la sección «Escenarios». */
import type { QaEscenario } from "@/lib/api/types";

/** «Crear» la primera vez; «Crear otro» si ya se creó: cada pulsación crea un caso nuevo. */
export function textoDelBoton(escenario: Pick<QaEscenario, "ultimo">): string {
  return escenario.ultimo ? "Crear otro" : "Crear";
}

/** Ruta interna del panel a la que lleva «Abrir». La ruta viene del backend: solo se acepta una ruta
 *  absoluta del propio panel (nunca otro origen ni `//host`), sin espacios ni protocolo. */
export function rutaDeAbrir(ruta: string | null | undefined): string | null {
  if (!ruta || !ruta.startsWith("/") || ruta.startsWith("//") || /[\s\\]/.test(ruta) || ruta.includes(":")) return null;
  return ruta;
}

/** Id del ancla de la tarjeta: el mismo slug que cita el catálogo (`datos-escenario-<slug>`), así el
 *  enlace «datos que requiere» de cada prueba baja a su tarjeta. */
export function anclaDe(slug: string): string {
  return `datos-escenario-${slug}`;
}

/** Los ítems de la guía que son escenarios se muestran como tarjeta de escenario, no en la guía. */
export function esEscenario(slug: string): boolean {
  return slug.startsWith("datos-escenario-");
}
