import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { LayoutGrid, List } from "lucide-react";

import { ConsolaConexiones } from "@/app/(app)/conexiones/_components/consola-conexiones";
import { NewConnectionDialog } from "@/app/(app)/conexiones/_components/new-connection-dialog";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { RecordarVista } from "@/components/domain/recordar-vista";
import { ListPage } from "@/components/templates/list-page";
import { Pagination } from "@/components/ui/pagination";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { apiFetch } from "@/lib/api/server";
import type { ConnectionsConsole, ConnectionsResponse, Me } from "@/lib/api/types";
import { VISTAS, vistaElegida, vistaEnEnlace } from "@/lib/vista-guardada";

export const metadata = { title: "Conexiones" };

const POR_PAGINA = 50;

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; vista?: string }>;
}) {
  const sp = await searchParams;
  const pagina = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const [resConsola, res, meRes, jar] = await Promise.all([
    apiFetch<ConnectionsConsole>(`/admin/connections/console?page=${pagina}&page_size=${POR_PAGINA}`),
    apiFetch<ConnectionsResponse>("/admin/connections"),
    apiFetch<Me>("/admin/me"),
    cookies(),
  ]);
  const guardada = jar.get(VISTAS.conexiones.cookie)?.value;
  const vista = vistaElegida("conexiones", typeof sp.vista === "string" ? sp.vista : undefined, guardada);
  const enlace = (v: string) => {
    const valor = vistaEnEnlace("conexiones", v, guardada);
    const params = new URLSearchParams();
    if (pagina > 1) params.set("page", String(pagina));
    if (valor) params.set("vista", valor);
    const qs = params.toString();
    return qs ? `/conexiones?${qs}` : "/conexiones";
  };
  const acciones: ReactNode = resConsola.ok ? (
    <>
      {resConsola.data.items.length > 0 && (
        <SegmentedControl
          label="Cómo ver las conexiones"
          value={vista}
          options={[
            { value: "lista", label: "Lista", icon: <List />, href: enlace("lista") },
            { value: "cuadricula", label: "Cuadrícula", icon: <LayoutGrid />, href: enlace("cuadricula") },
          ]}
        />
      )}
      {resConsola.data.can_edit && <NewConnectionDialog />}
    </>
  ) : undefined;
  const header = {
    title: "Conexiones",
    description: "Los canales por los que tu agente atiende a tus clientes.",
    helpSection: "connections",
    actions: acciones,
  };
  if (!resConsola.ok) {
    return (
      <ListPage header={header}>
        <ErrorDeCarga titulo="No se pudieron cargar las conexiones" detalle={resConsola.error} />
      </ListPage>
    );
  }
  const consola = resConsola.data;
  // El webhook es del negocio (uno solo): solo lo ve la plataforma, el dueño lo encuentra en su ficha.
  const webhookUrl = res.ok ? res.data.webhook_url : null;
  const hrefDePagina = (p: number) => {
    const params = new URLSearchParams({ page: String(p) });
    if (vista !== VISTAS.conexiones.porDefecto) params.set("vista", vista);
    return `/conexiones?${params.toString()}`;
  };

  return (
    <ListPage header={header}>
      <RecordarVista lista="conexiones" vista={vista} />
      <ConsolaConexiones
        consola={consola}
        webhookUrl={webhookUrl}
        esPlataforma={meRes.ok && meRes.data.role === "master"}
        vista={vista === "cuadricula" ? "cuadricula" : "lista"}
      />

      {(consola.has_more || pagina > 1) && (
        <Pagination
          page={pagina}
          hasMore={consola.has_more}
          total={consola.total}
          label="conexiones" singular="conexión"
          makeHref={hrefDePagina}
        />
      )}
    </ListPage>
  );
}
