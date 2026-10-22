import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { API_BASE, SESSION_COOKIE, TENANT_COOKIE } from "@/lib/api/server";

/**
 * BFF: sube la foto de un producto al backend (multipart, HU-CRM-05). El proxy genérico de
 * packs no sirve porque lee JSON; aquí se reenvía el `FormData` con la sesión y el negocio.
 */
export async function POST(request: Request) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const tenant = store.get(TENANT_COOKIE)?.value;
  const form = await request.formData();
  const res = await fetch(`${API_BASE}/api/v1/pack/commerce/products/image`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenant ? { "X-Tenant-Id": tenant } : {}),
    },
    body: form,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as
    | { error?: string | { message?: string }; image_key?: string; image_url?: string }
    | null;
  if (!res.ok) {
    const error = typeof json?.error === "string" ? json.error : json?.error?.message;
    return NextResponse.json({ error: error ?? "No se pudo subir la foto." }, { status: res.status });
  }
  return NextResponse.json(json ?? {});
}
