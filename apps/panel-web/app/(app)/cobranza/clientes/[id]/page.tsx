import { notFound, redirect } from "next/navigation";

import { apiFetch } from "@/lib/api/server";

/**
 * El cliente cuelga de su cartera: la ficha vive en `/cobranza/carteras/<cartera>/clientes/<cliente>`.
 * Los enlaces viejos (paleta, notificaciones, favoritos) llegan a ella.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await apiFetch<{ cliente: { id: string; cartera_id: string } }>(`/pack/cobranza/clients/${id}`);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar el cliente: {res.error}
      </p>
    );
  }
  redirect(`/cobranza/carteras/${res.data.cliente.cartera_id}/clientes/${res.data.cliente.id}`);
}
