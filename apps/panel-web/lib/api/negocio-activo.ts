/**
 * Negocio activo del panel (cookie `httpOnly` `panel_tenant`). Solo del lado del servidor
 * (BFF): se fija después de que la API confirma que la sesión tiene acceso a ese negocio.
 */
import { cookies } from "next/headers";

import { TENANT_COOKIE, apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";

const UN_ANO = 60 * 60 * 24 * 365;

/** Guarda la cookie del negocio activo, sin validar (el llamador ya lo validó). */
export async function guardarNegocioActivo(tenantId: string): Promise<void> {
  (await cookies()).set(TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: UN_ANO,
  });
}

/**
 * Deja `tenantId` como negocio activo si la sesión tiene acceso: lo pregunta a la API con
 * ese negocio en `X-Tenant-Id` y solo guarda la cookie si la API lo acepta.
 */
export async function fijarNegocioActivo(tenantId: string, token?: string | null): Promise<boolean> {
  const res = await apiFetch<Me>("/admin/me", { token, tenant: tenantId });
  if (!res.ok || res.data.tenant?.id !== tenantId) return false;
  await guardarNegocioActivo(tenantId);
  return true;
}
