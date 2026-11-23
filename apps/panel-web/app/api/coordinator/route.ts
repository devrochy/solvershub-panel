import { NextResponse } from "next/server";

import { responder } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";

type CoordinatorOptions = components["schemas"]["CoordinatorOptions"];
type CoordinatorOptionsUpdate = components["schemas"]["CoordinatorOptionsUpdate"];

/** BFF: opciones propias del Coordinador (HU-AOS-98, ADR-0211). El PUT es parcial: reenvía solo lo que llegó. */
export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as CoordinatorOptionsUpdate | null;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const res = await apiFetch<CoordinatorOptions>("/admin/coordinator", { method: "PUT", body });
  return responder(res);
}
