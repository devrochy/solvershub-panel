import Link from "next/link";
import { Plus } from "lucide-react";

import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { ListPage } from "@/components/templates/list-page";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/server";
import { ClientFormDialog, type CarteraOpcion, type Cliente } from "./_components/client-dialog";
import { FiltrosClientes } from "./_components/filtros-clientes";
import { TablaDeClientes } from "./_components/tabla-de-clientes";

export const metadata = { title: "Clientes" };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ cartera?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.cartera) qs.set("cartera_id", sp.cartera);
  if (sp.q) qs.set("q", sp.q);

  const [res, carterasRes] = await Promise.all([
    apiFetch<Cliente[]>(`/pack/cobranza/clients${qs.size ? `?${qs}` : ""}`),
    apiFetch<CarteraOpcion[]>("/pack/cobranza/portfolios"),
  ]);
  const carteras = carterasRes.ok ? carterasRes.data : [];
  const header = {
    title: "Clientes",
    actions:
      carteras.length > 0 ? (
        <ClientFormDialog
          carteras={carteras}
          trigger={
            <Button variant="accent">
              <Plus className="h-4 w-4" aria-hidden /> Nuevo cliente
            </Button>
          }
        />
      ) : (
        <Button asChild variant="outline">
          <Link href="/cobranza/carteras">Crea una cartera primero</Link>
        </Button>
      ),
  };
  if (!res.ok) {
    return (
      <ListPage header={header}>
        <ErrorDeCarga titulo="No se pudieron cargar los clientes" detalle={res.error} />
      </ListPage>
    );
  }

  return (
    <ListPage header={header} filters={<FiltrosClientes carteras={carteras} cartera={sp.cartera} q={sp.q} />}>
      <TablaDeClientes
        clientes={res.data}
        carteras={carteras}
        conCartera
        emptyTitle={sp.cartera || sp.q ? "No hay clientes con estos filtros" : "Sin clientes"}
        emptyDescription={sp.cartera || sp.q ? "Prueba con otra búsqueda o quita los filtros." : "Crea el primero con «Nuevo cliente»."}
      />
    </ListPage>
  );
}
