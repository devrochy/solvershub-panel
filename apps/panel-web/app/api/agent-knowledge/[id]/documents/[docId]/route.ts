import { invalido, reenviar, UUID } from "@/app/api/agent-knowledge/proxy";

/** Borra un documento del agente (borrado lógico que vacía su contenido). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  if (!UUID.test(id) || !UUID.test(docId)) return invalido();
  return reenviar(`/agents/${id}/documents/${docId}`, { method: "DELETE" });
}
