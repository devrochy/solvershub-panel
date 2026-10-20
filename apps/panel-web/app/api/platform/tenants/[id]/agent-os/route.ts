import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_COOKIE, apiFetch } from "@/lib/api/server";
import type { AgentOSEstado, AgentOSResultado } from "@/lib/api/types";
import { objetivoValido } from "@/lib/agent-os";

type Ctx = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** La API rechaza un `X-Tenant-Id` suspendido: si el negocio activo es el mismo, no se manda. */
async function sinTenantSiEsElMismo(id: string): Promise<{ tenant?: null }> {
  const activo = (await cookies()).get(TENANT_COOKIE)?.value;
  return activo === id ? { tenant: null } : {};
}

function error(res: { status: number; error: string; code?: string; details?: Record<string, unknown> }) {
  return NextResponse.json(
    { error: res.error, code: res.code, ...(res.details ? { details: res.details } : {}) },
    { status: res.status },
  );
}

/** BFF: estado del Agent OS de un negocio (master, HU-AOS-15). */
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
  const res = await apiFetch<AgentOSEstado>(`/admin/platform/tenants/${id}/agent-os`, await sinTenantSiEsElMismo(id));
  return res.ok ? NextResponse.json(res.data) : error(res);
}

async function enviar(request: Request, { params }: Ctx, simular: boolean) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
  const objetivo = objetivoValido(await request.json().catch(() => null));
  if (!objetivo) return NextResponse.json({ error: "Estado del Agent OS inválido." }, { status: 400 });
  const res = await apiFetch<AgentOSResultado>(
    `/admin/platform/tenants/${id}/agent-os${simular ? "/simular" : ""}`,
    { method: simular ? "POST" : "PUT", body: objetivo, ...(await sinTenantSiEsElMismo(id)) },
  );
  return res.ok ? NextResponse.json(res.data) : error(res);
}

/** Simular (dry-run): bloqueos, avisos y pasos, sin escribir nada. */
export async function POST(request: Request, ctx: Ctx) {
  return enviar(request, ctx, true);
}

/** Aplicar el cambio (backfills, migrar-a-v3 y banderas, auditado por la API). */
export async function PUT(request: Request, ctx: Ctx) {
  return enviar(request, ctx, false);
}
