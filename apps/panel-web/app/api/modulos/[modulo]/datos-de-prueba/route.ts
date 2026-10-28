import { invalido, responder } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";

type Ctx = { params: Promise<{ modulo: string }> };

const MODULOS = new Set(["ventas", "agenda", "cobranza", "suscripciones"]);

/** BFF de los datos de prueba por módulo (HU-QA-10): reenvía a `/admin/datos-de-prueba/{modulo}`. */
async function reenviar(params: Ctx["params"], method: "GET" | "POST" | "DELETE") {
  const { modulo } = await params;
  if (!MODULOS.has(modulo)) return invalido();
  return responder(await apiFetch(`/admin/datos-de-prueba/${modulo}`, { method }));
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
