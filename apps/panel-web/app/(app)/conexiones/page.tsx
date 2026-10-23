import { ConsolaConexiones } from "@/app/(app)/conexiones/_components/consola-conexiones";
import { NewConnectionDialog } from "@/app/(app)/conexiones/_components/new-connection-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

      {webhookUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Webhook del negocio</CardTitle>
            <p className="text-xs text-text-soft">
              Registralo en Meta con la URL y el verify token que se muestran abajo; sin esto los
              mensajes no llegan al asistente.
            </p>
          </CardHeader>
          <CardContent>
            <code className="block break-all rounded-md bg-bg-deep px-3 py-2 font-mono text-xs text-link">
              {webhookUrl}
            </code>
          </CardContent>
        </Card>
      )}

      <ConsolaConexiones consola={consola} />

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
