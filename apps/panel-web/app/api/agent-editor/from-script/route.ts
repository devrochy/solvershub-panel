import { invalido, responder } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { FromScriptOut } from "@/lib/api/types";

/** BFF: crea el borrador de un agente desde las respuestas del guion de su plantilla (HU-AOS-48/54). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    template_key?: unknown;
    answers?: unknown;
    name?: unknown;
  } | null;
  const key = typeof body?.template_key === "string" ? body.template_key : "";
  if (!/^[a-z0-9_]{2,40}$/.test(key)) return invalido("Plantilla inválida.");
  const crudas = body?.answers && typeof body.answers === "object" && !Array.isArray(body.answers) ? body.answers : {};
  // Solo viajan respuestas de texto con ids válidos: el resto lo valida la API por pregunta.
  const answers = Object.fromEntries(
    Object.entries(crudas as Record<string, unknown>)
      .filter(([id, v]) => /^[a-z0-9_]{1,40}$/.test(id) && typeof v === "string")
      .slice(0, 10),
  );
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim().slice(0, 120) : undefined;
  const res = await apiFetch<FromScriptOut>("/admin/agents/from-script", {
    method: "POST",
    body: { template_key: key, answers, ...(name ? { name } : {}) },
  });
  return responder(res, (data) => ({
    agentId: data.agent.id,
    warnings: data.warnings,
    requirements: data.requirements,
  }));
}
