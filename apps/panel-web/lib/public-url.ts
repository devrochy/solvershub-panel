/**
 * URL pública para redirigir al navegador desde una ruta del panel.
 *
 * Detrás del túnel, Next (standalone) arma `request.url` con su dirección interna
 * (`0.0.0.0:3000`), así que `new URL(path, request.url)` mandaría al usuario a una
 * dirección que no existe para él. El host y el protocolo reales vienen en los
 * encabezados del proxy (HU-CAL-07).
 */
function firstValue(raw: string | null): string | null {
  // `x-forwarded-*` puede traer una lista si hay varios proxies: manda el primero.
  const value = raw?.split(",")[0]?.trim();
  return value ? value : null;
}

export function publicUrl(request: Request, path: string): URL {
  const host = firstValue(request.headers.get("x-forwarded-host")) ?? firstValue(request.headers.get("host"));
  const proto = firstValue(request.headers.get("x-forwarded-proto")) ?? "https";
  return new URL(path, host ? `${proto}://${host}` : request.url);
}
