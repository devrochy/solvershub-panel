import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";

export const metadata = { title: "Propietario" };

type OwnerMessage = {
  id: string;
  direccion: string;
  tipo: string;
  autor: string;
  contenido: string;
  fecha: string;
};

type OwnerThread = {
  whatsapp: string;
  asunto: string;
  estado: string;
  abierto: boolean;
  mensajes: OwnerMessage[];
};

export default async function PropietarioPage() {
  const res = await apiFetch<OwnerThread>("/pack/cobranza/owner-thread");
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudo cargar el hilo con el propietario: {res.error}
      </p>
    );
  }
  const { whatsapp, asunto, estado, mensajes } = res.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Propietario"
        description={
          whatsapp ? `Hilo con el propietario · WhatsApp ${whatsapp}` : "Hilo con el propietario."
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/legacy/cobranza/propietario">Escribir en el clásico ↗</Link>
          </Button>
        }
      />

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-lg font-semibold text-headline">{asunto}</h2>
          <Badge variant={estado === "abierta" ? "success" : "neutral"}>{estado}</Badge>
        </div>
        {mensajes.length === 0 ? (
          <EmptyState
            title="Sin mensajes"
            description="Las notificaciones de cobro y los mensajes manuales aparecerán aquí."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {mensajes.map((m) => (
              <Card
                key={m.id}
                className={m.direccion === "saliente" ? "border-l-4 border-l-accent" : "border-l-4 border-l-border-soft"}
              >
                <div className="flex flex-wrap items-center gap-2 pb-2">
                  <Badge variant={m.direccion === "saliente" ? "accent" : "neutral"}>{m.direccion}</Badge>
                  <Badge variant="neutral">{m.tipo}</Badge>
                  <span className="text-[13px] text-body">{m.autor || "—"}</span>
                  <span className="ml-auto text-[13px] text-body">{m.fecha}</span>
                </div>
                <p className="text-body whitespace-pre-wrap">{m.contenido}</p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
