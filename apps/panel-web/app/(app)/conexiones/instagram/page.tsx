import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { EstadoInstagram } from "@/lib/instagram-alta";

import { InstagramAlta } from "./_components/instagram-alta";

export const metadata = { title: "Conectar Instagram" };

export default async function ConectarInstagramPage() {
  const res = await apiFetch<EstadoInstagram>("/admin/meta/instagram");
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar el alta de Instagram: {res.error}
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
        title="Conectar Instagram"
        description="Conecta la cuenta profesional de Instagram de tu negocio para atender sus mensajes directos con tu asistente."
      />
      <InstagramAlta estado={res.data} />
    </div>
  );
}
