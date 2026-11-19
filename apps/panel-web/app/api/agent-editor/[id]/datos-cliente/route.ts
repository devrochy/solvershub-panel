import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import { METODOS_ENTREGA, type AgenteDatos } from "@/lib/datos-cliente";

const NIVELES = new Set(["requerido", "recomendado", "no_pedir"]);
const METODOS = new Set<string>(METODOS_ENTREGA.map((m) => m.id));

/**
 * ¿Es una lista de métodos de entrega conocidos? Vacía también pasa: la regla «al menos uno» es del
 * backend (422 `metodos_entrega_vacios`) y el BFF devuelve su respuesta tal cual (HU-AOS-85).
 */
function metodosValidos(valor: unknown): valor is string[] {
  return Array.isArray(valor) && valor.every((m) => typeof m === "string" && METODOS.has(m));
}

/** ¿Es `{ acción: { dato: nivel } }` con niveles conocidos? Lo demás lo valida el backend. */
function politicaValida(valor: unknown): valor is Record<string, Record<string, string>> {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) return false;
  return Object.values(valor).every(
    (ajustes) =>
      typeof ajustes === "object" &&
      ajustes !== null &&
      !Array.isArray(ajustes) &&
      Object.values(ajustes).every((nivel) => typeof nivel === "string" && NIVELES.has(nivel)),
  );
}

/** BFF: datos del cliente de ESTE agente (HU-CRM-28): política, herramientas y métodos de entrega (HU-AOS-85). */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return invalido();
  const res = await apiFetch<AgenteDatos>(`/admin/agents/${id}/datos-cliente`);
  return responder(res);
}

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return invalido();
  const body = (await request.json().catch(() => null)) as {
    politica?: unknown;
    herramientas_del_agente?: unknown;
    metodos_entrega?: unknown;
  } | null;
  const hayPolitica = body?.politica !== undefined;
  const hayHerramientas = body?.herramientas_del_agente !== undefined;
  const hayMetodos = body?.metodos_entrega !== undefined;
  if (
    !body ||
    (!hayPolitica && !hayHerramientas && !hayMetodos) ||
    (hayPolitica && !politicaValida(body.politica)) ||
    (hayHerramientas && typeof body.herramientas_del_agente !== "boolean") ||
    (hayMetodos && !metodosValidos(body.metodos_entrega))
  ) {
    return invalido("Cuerpo inválido.");
  }
  const res = await apiFetch<AgenteDatos>(`/admin/agents/${id}/datos-cliente`, {
    method: "PUT",
    body: {
      ...(hayPolitica ? { politica: body.politica } : {}),
      ...(hayHerramientas ? { herramientas_del_agente: body.herramientas_del_agente } : {}),
      // Sin esto, apagar «A domicilio» no se guardaba (HU-AOS-85).
      ...(hayMetodos ? { metodos_entrega: body.metodos_entrega } : {}),
    },
  });
  return responder(res);
}
