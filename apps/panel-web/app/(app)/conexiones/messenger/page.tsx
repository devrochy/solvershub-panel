import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { EstadoMessenger } from "@/lib/messenger-alta";

import { MessengerAlta } from "./_components/messenger-alta";

export const metadata = { title: "Conectar Messenger" };

export default async function ConectarMessengerPage() {
  const res = await apiFetch<EstadoMessenger>("/admin/meta/messenger");
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar el alta de Messenger: {res.error}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/conexiones">← Conexiones</Link>
        </Button>
      </div>
      <PageHeader
        title="Conectar Messenger"
        description="Conecta las Páginas de Facebook de tu negocio para atender sus mensajes con tu asistente."
      />
      <MessengerAlta estado={res.data} />
    </div>
  );
}
