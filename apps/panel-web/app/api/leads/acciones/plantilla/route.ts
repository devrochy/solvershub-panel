import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { ConexionDeEnvio, VistaPreviaEnvio } from "@/lib/api/types";
import { consultaClientes, type FiltrosClientes } from "@/lib/clientes";

/** BFF (HU-CRM-06): conexiones de WhatsApp con sus plantillas de marketing aprobadas. */
export async function GET() {
  const res = await apiFetch<ConexionDeEnvio[]>("/admin/leads/acciones/plantilla/conexiones");
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}

/** BFF: vista previa con los filtros de Clientes de la URL (`?q=…&filtro=…`). */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const filtros: FiltrosClientes = {
    q: url.searchParams.get("q") ?? undefined,
    channel: url.searchParams.get("channel") ?? undefined,
    connection_id: url.searchParams.get("connection_id") ?? undefined,
    filtro: url.searchParams.getAll("filtro"),
  };
  const qs = consultaClientes(filtros, { conPagina: false });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.connection_id !== "string" || typeof body.template_id !== "string") {
    return NextResponse.json({ error: "Elige la conexión y la plantilla." }, { status: 400 });
  }
  const res = await apiFetch<VistaPreviaEnvio>(
    `/admin/leads/acciones/plantilla/vista-previa${qs.size ? `?${qs.toString()}` : ""}`,
    {
      method: "POST",
      body: { connection_id: body.connection_id, template_id: body.template_id, variables: body.variables ?? {} },
    },
  );
  if (!res.ok) return NextResponse.json({ error: res.error, code: res.code }, { status: res.status });
  return NextResponse.json(res.data);
}
