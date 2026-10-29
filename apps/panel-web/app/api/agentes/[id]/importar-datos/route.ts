import { cuerpoDeImportacion, invalido, reenviarImportacion, UUID } from "@/app/api/agentes/importar-proxy";

type Ctx = { params: Promise<{ id: string }> };

/** Estado de la importación del agente (HU-QA-12). */
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return invalido();
  return reenviarImportacion(`/${id}/importar-datos`, { method: "GET" });
}

/** Confirma la importación del archivo (multipart: `archivo` y `solo_validas` opcional). */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return invalido();
  const cuerpo = await cuerpoDeImportacion(request, true);
  if (!cuerpo) return invalido();
  return reenviarImportacion(`/${id}/importar-datos`, { method: "POST", body: cuerpo });
}

/** Borra lo importado para el agente. */
export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return invalido();
  return reenviarImportacion(`/${id}/importar-datos`, { method: "DELETE" });
}
