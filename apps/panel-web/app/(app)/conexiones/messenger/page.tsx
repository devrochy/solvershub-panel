import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { EstadoMessenger } from "@/lib/messenger-alta";

import { MessengerAlta } from "./_components/messenger-alta";

export const metadata = { title: "Conectar Messenger" };

export default async function ConectarMessengerPage() {
  const res = await apiFetch<EstadoMessenger>("/admin/meta/messenger");
  if (!res.ok) {
    return <ErrorDeCarga titulo="No se pudo preparar la conexión de Messenger" detalle={res.error} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Conectar Messenger"
        description="Conecta la Página de Facebook de tu negocio para que tu agente responda sus mensajes."
      />
      <MessengerAlta estado={res.data} />
    </div>
  );
}
