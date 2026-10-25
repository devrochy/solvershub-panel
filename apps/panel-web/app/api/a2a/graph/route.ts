import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { GraphOut } from "@/lib/api/types";

const MODOS = new Set(["handoff", "delegate", "query"]);

/**
 * BFF: publica los permisos entre agentes del negocio (HU-AOS-26, `PUT /admin/a2a/graph`). Solo
 * reenvía pares con ids válidos y modos conocidos; el resto de campos del enlace lo valida la API.
 */
export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as { links?: unknown } | null;
  const links = body?.links;
  if (!Array.isArray(links) || links.length > 200) return invalido();
  for (const l of links) {
    const enlace = l as Record<string, unknown> | null;
    if (
      !enlace ||
      typeof enlace.from_agent_id !== "string" ||
      typeof enlace.to_agent_id !== "string" ||
      !UUID.test(enlace.from_agent_id) ||
      !UUID.test(enlace.to_agent_id) ||
      !Array.isArray(enlace.modes) ||
      !enlace.modes.every((m) => typeof m === "string" && MODOS.has(m))
    ) {
      return invalido();
    }
  }
  const res = await apiFetch<GraphOut>("/admin/a2a/graph", { method: "PUT", body: { links } });
  return responder(res);
}
