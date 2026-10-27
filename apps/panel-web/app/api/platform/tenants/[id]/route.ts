import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_COOKIE, apiFetch } from "@/lib/api/server";
import { mensajeErrorNegocio } from "@/lib/eliminar-negocio";

const PATHS: Record<string, string> = {
  plan: "plan",
  activate: "activate",
  deactivate: "deactivate",
  purge: "purge",
  resend_access: "owner-invitation/resend",
};

/** BFF: ciclo de vida, plan y reenvío del acceso del dueño de un negocio (master). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as
    | ({ action?: string } & Record<string, unknown>)
    | null;
  const action = body?.action ?? "";
  const segment = PATHS[action];
  if (!segment) {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }

  const payload = { ...(body ?? {}) };
  delete payload.action;

  // La API rechaza un `X-Tenant-Id` suspendido: si el negocio activo del panel es el mismo
  // sobre el que se actúa (p. ej. purgar el que se acaba de desactivar), no se manda y la API
  // usa otro negocio activo del master.
  const activo = (await cookies()).get(TENANT_COOKIE)?.value;
  const res = await apiFetch(`/admin/platform/tenants/${id}/${segment}`, {
    method: "POST",
    body: payload,
    ...(activo === id ? { tenant: null } : {}),
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: mensajeErrorNegocio(res), code: res.code },
      { status: res.status },
    );
  }
  // El reenvío del acceso devuelve qué pasó con el correo (nunca el enlace).
  if (action === "resend_access") return NextResponse.json({ ok: true, invitation: res.data });
  return NextResponse.json({ ok: true });
}
