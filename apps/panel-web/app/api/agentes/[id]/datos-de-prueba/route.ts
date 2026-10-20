import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";

type Ctx = { params: Promise<{ id: string }> };

/** BFF de los datos de prueba del agente (HU-QA-10): reenvía a `/admin/agents/{id}/datos-de-prueba`. */
async function reenviar(params: Ctx["params"], method: "GET" | "POST" | "DELETE") {
  const { id } = await params;
  if (!UUID.test(id)) return invalido();
  return responder(await apiFetch(`/admin/agents/${id}/datos-de-prueba`, { method }));
}

export async function GET(_request: Request, { params }: Ctx) {
  return reenviar(params, "GET");
}

export async function POST(_request: Request, { params }: Ctx) {
  return reenviar(params, "POST");
}

export async function DELETE(_request: Request, { params }: Ctx) {
  return reenviar(params, "DELETE");
}
