import { invalido, reenviar, UUID } from "@/app/api/agent-knowledge/proxy";

type Ctx = { params: Promise<{ id: string }> };

/** Documentos del agente (HU-AOS-49). */
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return invalido();
  return reenviar(`/agents/${id}/documents`, { method: "GET" });
}

/** Sube un documento (multipart: `archivo` y `titulo` opcional). */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return invalido();
  const recibido = await request.formData().catch(() => null);
  const archivo = recibido?.get("archivo");
  if (!recibido || !(archivo instanceof Blob)) return invalido();
  // Solo los campos que la API conoce: nunca se reenvía otra cosa.
  const form = new FormData();
  form.set("archivo", archivo, archivo instanceof File ? archivo.name : "documento");
  const titulo = recibido.get("titulo");
  if (typeof titulo === "string" && titulo.trim()) form.set("titulo", titulo.trim().slice(0, 200));
  return reenviar(`/agents/${id}/documents`, { method: "POST", body: form });
}
