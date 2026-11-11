import { ConsolaConexiones } from "@/app/(app)/conexiones/_components/consola-conexiones";
import { NewConnectionDialog } from "@/app/(app)/conexiones/_components/new-connection-dialog";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { ListPage } from "@/components/templates/list-page";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type { ConnectionsConsole, ConnectionsResponse, Me } from "@/lib/api/types";

export const metadata = { title: "Conexiones" };

const POR_PAGINA = 50;

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const pagina = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);
  const [resConsola, res, meRes] = await Promise.all([
    apiFetch<ConnectionsConsole>(`/admin/connections/console?page=${pagina}&page_size=${POR_PAGINA}`),
    apiFetch<ConnectionsResponse>("/admin/connections"),
    apiFetch<Me>("/admin/me"),
  ]);
  const header = {
    title: "Conexiones",
    description: "Los canales por los que tu agente atiende a tus clientes.",
    helpSection: "connections",
    actions: resConsola.ok && resConsola.data.can_edit ? <NewConnectionDialog /> : undefined,
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

  return (
    <ListPage header={header}>
      <ConsolaConexiones consola={consola} webhookUrl={webhookUrl} esPlataforma={meRes.ok && meRes.data.role === "master"} />

      {(consola.has_more || pagina > 1) && (
        <Pagination
          page={pagina}
          hasMore={consola.has_more}
          total={consola.total}
          label="conexiones" singular="conexión"
          makeHref={(p) => `/conexiones?page=${p}`}
        />
      )}
    </ListPage>
  );
}
