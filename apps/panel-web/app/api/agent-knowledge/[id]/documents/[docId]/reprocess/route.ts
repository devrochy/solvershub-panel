import { invalido, reenviar, UUID } from "@/app/api/agent-knowledge/proxy";

/** Vuelve a procesar un documento (fallido o con un troceado anterior). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  if (!UUID.test(id) || !UUID.test(docId)) return invalido();
  return reenviar(`/agents/${id}/documents/${docId}/reprocess`, { method: "POST" });
}
