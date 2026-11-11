/**
 * Costos técnicos en palabras (CYP-09 y 10): las categorías de Meta en español, el país con su nombre y
 * las conversaciones por cuándo fueron, no por su id.
 */

const CATEGORIA: Record<string, string> = {
  marketing: "Marketing",
  utility: "Utilidad (avisos y confirmaciones)",
  service: "Servicio (respuestas dentro de 24 h)",
  authentication: "Autenticación (códigos)",
  authentication_international: "Autenticación internacional",
  marketing_lite: "Marketing ligero",
};

export function categoriaDeMeta(categoria: string): string {
  return CATEGORIA[categoria.toLowerCase()] ?? `${categoria.charAt(0).toUpperCase()}${categoria.slice(1).replace(/_/g, " ")}`;
}

const PAISES = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["es"], { type: "region" }) : null;

/** «CO» → «Colombia»; lo que no es un código de país se deja tal cual. */
export function paisDeMeta(codigo: string): string {
  if (!/^[A-Za-z]{2}$/.test(codigo)) return codigo || "Sin país";
  try {
    return PAISES?.of(codigo.toUpperCase()) ?? codigo;
  } catch {
    return codigo;
  }
}

/** «Conversación de hoy», «Conversación de ayer», «Hace 3 días», «7 de nov.». */
export function cuandoFueCosto(valor: string | null | undefined, ahora: Date = new Date()): string {
  if (!valor) return "Conversación sin fecha";
  const f = new Date(valor);
  if (Number.isNaN(f.getTime())) return "Conversación sin fecha";
  const dia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dias = Math.round((dia(ahora) - dia(f)) / 86_400_000);
  if (dias <= 0) return "Conversación de hoy";
  if (dias === 1) return "Conversación de ayer";
  if (dias < 7) return `Hace ${dias} días`;
  return `Conversación del ${new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(f)}`;
}
