import { apiFetch } from "@/lib/api/server";
import { NotesCard } from "../../_components/notes-card";
import type { Nota } from "../../_lib/cartera";

export const metadata = { title: "Notas de la cartera" };

export default async function CarteraNotasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notasRes = await apiFetch<Nota[]>(`/pack/cobranza/portfolios/${id}/notes`);
  return <NotesCard notes={notasRes.ok ? notasRes.data : []} portfolioId={id} />;
}
