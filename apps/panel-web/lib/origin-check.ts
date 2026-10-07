/**
 * Verificación de origen del BFF (HU-ARCH-04), separada del middleware para probarla.
 *
 * Detrás de Cloudflare/Traefik el TLS termina antes del contenedor: Next recibe la petición
 * por `http` y `request.nextUrl.origin` no coincide con el `Origin: https://…` del navegador.
 * Por eso se compara el **host** del `Origin` con el host que vio el proxy
 * (`x-forwarded-host`, si no `host`), igual que hace Next con sus server actions.
 * Un sitio ajeno no puede fijar esas cabeceras en una petición de navegador sin un
 * preflight de CORS que el panel no concede.
 */

export const ORIGIN_REJECTED_MESSAGE = "Origen no permitido.";

/** Cabeceras que importan, en minúsculas (como `Headers.get`). */
export type HeaderLookup = { get(name: string): string | null };

function firstValue(raw: string | null): string | null {
  // `x-forwarded-host` puede traer una lista si hay varios proxies: manda el primero.
  const value = raw?.split(",")[0]?.trim().toLowerCase();
  return value ? value : null;
}

/**
 * `true` si la petición puede seguir. Sin `Origin` (curl, webhooks, el backend) pasa;
 * con `Origin`, tiene que ser del mismo host o estar en `extra` (`ORIGINS_PERMITIDAS`).
 */
export function origenPermitido(origin: string | null, headers: HeaderLookup, extra: string[] = []): boolean {
  if (!origin) return true;
  if (extra.includes(origin)) return true;

  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }
  const expectedHost = firstValue(headers.get("x-forwarded-host")) ?? firstValue(headers.get("host"));
  return expectedHost !== null && originHost === expectedHost;
}

/** `ORIGINS_PERMITIDAS` (CSV) como lista. */
export function parseExtraOrigins(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
