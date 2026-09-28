import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_BASE, SESSION_COOKIE, TENANT_COOKIE } from "@/lib/api/server";

export const dynamic = "force-dynamic";

/**
 * Proxy del panel clásico (SSR de agent-core) mientras se reconstruyen sus
 * secciones en este panel (packs, playground, DLQ, plantillas, wizards).
 *
 * - Reenvía `/legacy/<ruta>` a `agent-core/<ruta>` inyectando la cookie de sesión
 *   (`agent_core_session`) a partir del token del panel y el tenant activo
 *   (`ac_tenant`) desde la selección del panel. Misma sesión, sin segundo login.
 * - Reescribe las URLs absolutas de raíz del HTML (`/admin`, `/static`, `/crm`,
 *   `/calendar`, `/cobranza`) a `/legacy/...` — mismas reglas que el
 *   `PathPrefixMiddleware` del SSR (ADR-0073) — para que links, assets, forms y
 *   `fetch(...)` sigan funcionando.
 */

const PREFIXES = "admin|static|crm|calendar|cobranza";
const PREFIX_RE = new RegExp(`^/(${PREFIXES})`);

function rewriteHtml(html: string): string {
  return html
    .replace(new RegExp(`(href|src|action)="/(${PREFIXES})`, "g"), '$1="/legacy/$2')
    .replace(new RegExp(`\\.action\\s*=\\s*"/(${PREFIXES})`, "g"), '.action = "/legacy/$1')
    .replace(new RegExp(`(fetch|open)\\(\\s*["']/(${PREFIXES})`, "g"), '$1("/legacy/$2')
    .replace(
      new RegExp(`(location\\.(?:href|assign|replace)\\s*\\(?\\s*["'])/(${PREFIXES})`, "g"),
      "$1/legacy/$2",
    );
}

function rewriteLocation(location: string): string {
  return PREFIX_RE.test(location) ? `/legacy${location}` : location;
}

async function proxy(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const tenant = store.get(TENANT_COOKIE)?.value;
  const target = `${API_BASE}/${(path ?? []).join("/")}${new URL(request.url).search}`;

  const headers = new Headers();
  headers.set("cookie", `agent_core_session=${token}${tenant ? `; ac_tenant=${tenant}` : ""}`);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);

  const method = request.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await fetch(target, { method, headers, body, redirect: "manual", cache: "no-store" });
  } catch {
    return NextResponse.json({ error: "No se pudo contactar el backend." }, { status: 502 });
  }

  const upstreamType = upstream.headers.get("content-type") ?? "";
  const responseHeaders = new Headers();
  responseHeaders.set("content-type", upstreamType);
  // Solo se propaga el tenant del panel clásico; su sesión (`agent_core_session`)
  // la inyecta este proxy, no debe quedar como cookie huérfana en este origen.
  for (const cookieValue of upstream.headers.getSetCookie()) {
    if (cookieValue.startsWith("ac_tenant=")) {
      responseHeaders.append("set-cookie", cookieValue);
    }
  }
  const location = upstream.headers.get("location");
  if (location) responseHeaders.set("location", rewriteLocation(location));

  if (upstreamType.includes("text/html")) {
    const html = await upstream.text();
    return new NextResponse(rewriteHtml(html), {
      status: upstream.status,
      headers: responseHeaders,
    });
  }

  return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
