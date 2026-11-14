import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";

type Ctx = { params: Promise<{ id: string }> };

/** Lo generado e importado del agente, con nombre y detalle (HU-QA-16, solo en test). */
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return invalido();
  return responder(await apiFetch(`/admin/agents/${id}/datos-de-prueba/registros`));
}
