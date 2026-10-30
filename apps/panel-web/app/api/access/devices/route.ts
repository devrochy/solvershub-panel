import { NextResponse } from "next/server";

import { respuestaDeAcceso } from "@/lib/api/access-respuesta";
import { apiFetch } from "@/lib/api/server";

/** BFF: lista de dispositivos del negocio (paginada por cursor) y alta manual. */
export async function GET(request: Request) {
  const entrada = new URL(request.url).searchParams;
  const salida = new URLSearchParams();
  for (const clave of ["estado", "admin_id", "cursor"]) {
    const valor = entrada.get(clave);
    if (valor) salida.set(clave, valor);
  }
  const consulta = salida.toString();
  return respuestaDeAcceso(await apiFetch(`/access/devices${consulta ? `?${consulta}` : ""}`));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.admin_id !== "string" || typeof body.device_id !== "string") {
    return NextResponse.json({ error: "Indica la cuenta y el identificador del equipo." }, { status: 400 });
  }
  const payload = {
    admin_id: body.admin_id,
    device_id: body.device_id,
    label: typeof body.label === "string" && body.label.trim() ? body.label.trim() : null,
    plataforma: body.plataforma === "ios" ? "ios" : "android",
  };
  return respuestaDeAcceso(await apiFetch("/access/devices", { method: "POST", body: payload }));
}
