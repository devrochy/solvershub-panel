/**
 * Cabeceras con la IP del usuario para reenviar a la API desde el BFF.
 *
 * El BFF llama a la API por la red interna: sin esto, la API ve a todos los usuarios
 * con la IP del panel y el bloqueo de login (HU-ARCH-04) los bloquea juntos. Se reenvía
 * tal cual lo que puso el proxy de entrada (Cloudflare, Traefik): la API solo lo lee si
 * la conexión viene de un proxy de confianza y toma la primera IP no confiable de
 * derecha a izquierda, así que lo que escriba el navegador a la izquierda no cuenta.
 */
export function clientIpHeaders(incoming: Headers): Record<string, string> {
  const headers: Record<string, string> = {};
  const xff = incoming.get("x-forwarded-for")?.trim();
  if (xff) headers["X-Forwarded-For"] = xff;
  const cf = incoming.get("cf-connecting-ip")?.trim();
  if (cf) headers["CF-Connecting-IP"] = cf;
  return headers;
}
