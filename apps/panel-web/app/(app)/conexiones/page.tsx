import { ConsolaConexiones } from "@/app/(app)/conexiones/_components/consola-conexiones";
import { NewConnectionDialog } from "@/app/(app)/conexiones/_components/new-connection-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type { ConnectionsConsole, ConnectionsResponse } from "@/lib/api/types";

export const metadata = { title: "Conexiones" };

const POR_PAGINA = 50;

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const pagina = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);
  const [resConsola, res] = await Promise.all([
    apiFetch<ConnectionsConsole>(`/admin/connections/console?page=${pagina}&page_size=${POR_PAGINA}`),
    apiFetch<ConnectionsResponse>("/admin/connections"),
  ]);
  if (!resConsola.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar las conexiones: {resConsola.error}
      </p>
    );
  }
  const consola = resConsola.data;
  // El webhook es del negocio (uno solo), por eso vive aquí y no en cada conexión.
  const webhookUrl = res.ok ? res.data.webhook_url : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Conexiones"
        description="Canales por los que tu agente atiende. Las credenciales se guardan cifradas (Fernet) y no dependen del .env; cada negocio tiene su propio webhook y verify token."
        helpSection="connections"
        actions={consola.can_edit ? <NewConnectionDialog /> : undefined}
      />


      <ConsolaConexiones consola={consola} webhookUrl={webhookUrl} />

      {(consola.has_more || pagina > 1) && (
        <Pagination
          page={pagina}
          hasMore={consola.has_more}
          total={consola.total}
          label="conexiones"
          makeHref={(p) => `/conexiones?page=${p}`}
        />
      )}
    </div>
  );
}
