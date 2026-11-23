import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";

type AgentDeclarativeToolsOut = components["schemas"]["AgentDeclarativeToolsOut"];

/**
 * BFF: tools HTTP del agente (HU-AOS-97). Reenvía las tools, los valores nuevos de sus secretos (solo escritura:
 * la API los cifra y nunca los devuelve) y el `lock_version`. Los secretos viajan solo como texto.
 */
export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return invalido();
  const body = (await request.json().catch(() => null)) as
    | { tools?: unknown; secrets?: unknown; lock_version?: unknown }
    | null;
  const secrets = body?.secrets ?? {};
  const secretosValidos =
    typeof secrets === "object" &&
    secrets !== null &&
    !Array.isArray(secrets) &&
    Object.values(secrets).every((v) => typeof v === "string");
  if (!body || !Array.isArray(body.tools) || !secretosValidos || !Number.isInteger(body.lock_version)) return invalido();
  const res = await apiFetch<AgentDeclarativeToolsOut>(`/admin/agents/${id}/declarative-tools`, {
    method: "PUT",
    body: { tools: body.tools, secrets, lock_version: body.lock_version },
  });
  return responder(res);
}
