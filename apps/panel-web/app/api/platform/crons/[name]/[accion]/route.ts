import { invalido, responder } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import { validarCron } from "@/lib/crons";

type Ctx = { params: Promise<{ name: string; accion: string }> };

/** Nombre de una tarea del catálogo: `core.billing_renovacion`, `pack_cobranza.marcar_mora`. */
const NOMBRE = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;

// Solo estas acciones llegan a la API (gestión de crons, ADR-0183; el servidor exige master).
const POR_POST = new Set(["run", "pause", "resume"]);

function ruta(name: string, accion: string): string {
  return `/admin/platform/crons/${encodeURIComponent(name)}/${accion}`;
}

/** BFF: ejecutar ahora, pausar o reanudar un cron. */
export async function POST(_request: Request, ctx: Ctx) {
  const { name, accion } = await ctx.params;
  if (!NOMBRE.test(name) || !POR_POST.has(accion)) return invalido();
  return responder(await apiFetch<unknown>(ruta(name, accion), { method: "POST" }));
}

/** BFF: reprogramar un cron. El cuerpo es solo `{ schedule }`: cualquier otro campo se descarta. */
export async function PUT(request: Request, ctx: Ctx) {
  const { name, accion } = await ctx.params;
  if (!NOMBRE.test(name) || accion !== "schedule") return invalido();
  const cuerpo = (await request.json().catch(() => null)) as { schedule?: unknown } | null;
  if (typeof cuerpo?.schedule !== "string") return invalido("Escribe el horario del cron.");
  const error = validarCron(cuerpo.schedule);
  if (error) return invalido(error);
  return responder(await apiFetch<unknown>(ruta(name, "schedule"), { method: "PUT", body: { schedule: cuerpo.schedule } }));
}

/** BFF: restaurar el horario por defecto del código. */
export async function DELETE(_request: Request, ctx: Ctx) {
  const { name, accion } = await ctx.params;
  if (!NOMBRE.test(name) || accion !== "schedule") return invalido();
  return responder(await apiFetch<unknown>(ruta(name, "schedule"), { method: "DELETE" }));
}
