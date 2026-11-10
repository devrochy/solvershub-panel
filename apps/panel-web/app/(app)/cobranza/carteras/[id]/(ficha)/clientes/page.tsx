import { notFound } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/server";
import { formatNumber } from "@/lib/format";
import {
  ClientFormDialog,
  type CarteraOpcion,
  type Cliente,
} from "../../../../clientes/_components/client-dialog";
import { TablaDeClientes } from "../../../../clientes/_components/tabla-de-clientes";
import { cargarCartera } from "../../_lib/cartera";

export const metadata = { title: "Clientes de la cartera" };

export default async function CarteraClientesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [res, clientesRes, carterasRes] = await Promise.all([
    cargarCartera(id),
    apiFetch<Cliente[]>(`/pack/cobranza/clients?cartera_id=${id}`),
    apiFetch<CarteraOpcion[]>("/pack/cobranza/portfolios"),
  ]);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return null; // el layout ya muestra el error
  }
  const c = res.data;
  const clientes = clientesRes.ok ? clientesRes.data : [];
  const carteras = carterasRes.ok ? carterasRes.data : [];

  return (
    <section aria-labelledby="clientes-cartera" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="clientes-cartera" className="font-display text-sh-block text-headline">
          Clientes ({formatNumber(c.clientes)})
        </h2>
        {carteras.length > 0 && (
          <ClientFormDialog
            carteras={carteras}
            defaultCarteraId={c.id}
            trigger={
              <Button variant="accent">
                <Plus className="h-4 w-4" aria-hidden /> Nuevo cliente
              </Button>
            }
          />
        )}
      </div>
      <TablaDeClientes
        clientes={clientes}
        carteras={carteras}
        emptyTitle="Sin clientes en esta cartera"
        emptyDescription="Agrega el primer cliente con «Nuevo cliente»: queda asignado a esta cartera."
      />
    </section>
  );
}
