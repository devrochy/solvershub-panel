import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";

type Ctx = { params: Promise<{ turnId: string }> };

const KIND = /^[a-z0-9_]{1,60}$/;

/** BFF: marcar un rechazo del verificador como falso positivo (HU-AOS-29). Idempotente. */
export async function POST(request: Request, ctx: Ctx) {
  const { turnId } = await ctx.params;
  if (!UUID.test(turnId)) return invalido();
  const body = (await request.json().catch(() => null)) as { kind?: unknown; note?: unknown } | null;
  const kind = typeof body?.kind === "string" ? body.kind : "";
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : "";
  if (!KIND.test(kind)) return invalido();
  const res = await apiFetch<unknown>(`/admin/reliability/verifier/${turnId}/false-positive`, {
    method: "POST",
    body: { kind, ...(note ? { note } : {}) },
  });
  return responder(res);
}
