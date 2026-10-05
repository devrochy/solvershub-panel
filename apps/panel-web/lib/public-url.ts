/**
 * URL pública para redirigir al navegador desde una ruta del panel.
 *
 * Detrás del túnel, Next (standalone) arma `request.url` con su dirección interna
 * (`0.0.0.0:3000`), así que `new URL(path, request.url)` mandaría al usuario a una
 * dirección que no existe para él. El host y el protocolo reales vienen en los
 * encabezados del proxy (HU-CAL-07).
 */
export function publicUrl(request: Request, path: string): URL {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return new URL(path, host ? `${proto}://${host}` : request.url);
}
