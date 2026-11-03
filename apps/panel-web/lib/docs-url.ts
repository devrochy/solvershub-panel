/**
 * Destino del enlace «Documentación» de la tarjeta del usuario.
 *
 * Lo fija la variable de servidor `WIKI_URL` (se lee en runtime, no en el build, como
 * `AGENT_CORE_API_URL`): una ruta del propio panel (`/ayuda`, que comparte la sesión) o una URL
 * absoluta `https://`. Sin variable, o con un valor que no sea ninguna de las dos, devuelve
 * `null` y el ítem no se muestra, para no dejar un enlace muerto ni abrir esquemas peligrosos
 * (`javascript:`, `data:`) ni destinos que heredan el protocolo (`//otro-sitio`).
 */
export function resolverDocsUrl(valor: string | null | undefined): string | null {
  const url = valor?.trim();
  if (!url) return null;
  if (url.startsWith("/") && !url.startsWith("//") && !url.includes("\\")) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}
