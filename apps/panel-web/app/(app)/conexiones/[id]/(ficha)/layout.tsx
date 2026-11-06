import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { PausarConexion } from "@/app/(app)/conexiones/_components/pausar-conexion";
import { PestanasFicha } from "@/app/(app)/conexiones/_components/pestanas-ficha";
import { ChannelIcon } from "@/components/domain/channel-icon";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { estadoDeConexion, iconoDeConexion, numerosDeLaCuenta, pestanasDeFicha, subtituloDeFicha } from "@/lib/conexion-ficha";
import { cargarFicha } from "@/lib/conexion-ficha-servidor";
import { puedePausar, saludDeConexion, textoConfirmarPausa } from "@/lib/conexiones";

/**
 * Ficha de una conexión (HU-UX-09, D-37): migas «Conexiones › nombre», tipo legible y detalle,
 * estado, Pausar y las pestañas de su tipo. Cada pestaña es una ruta.
 */
export default async function FichaDeConexionLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await cargarFicha(id);
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar la conexión: {res.error}
      </p>
    );
  }
  if (!res.ficha) notFound();
  const { conexion: c, tipo, consola } = res.ficha;
  const estado = estadoDeConexion(c);
  const salud = saludDeConexion(c.health);
  const numeros = tipo === "whatsapp_meta" ? numerosDeLaCuenta(consola.items, c.meta_connection_id) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={c.label}
        description={subtituloDeFicha(c, tipo)}
        breadcrumbs={[{ label: "Conexiones", href: "/conexiones" }, { label: c.label }]}
        actions={
          <>
            <ChannelIcon id={iconoDeConexion(c)} />
            <Badge variant={estado.tono}>{estado.label}</Badge>
            {c.meta_connection_id && salud.tono !== "neutral" && <Badge variant={salud.tono}>{salud.label}</Badge>}
            {puedePausar(c, consola.can_edit) && (
              <PausarConexion
                id={c.meta_connection_id ?? c.id}
                tipo={c.meta_connection_id ? "meta_connection" : "channel"}
                pausada={c.health === "paused"}
                textoConfirmacion={textoConfirmarPausa(c)}
              />
            )}
          </>
        }
        tabs={<PestanasFicha items={pestanasDeFicha(c.id, tipo)} />}
      />
      {numeros.length > 1 && (
        <p role="note" className="rounded-md bg-status-info-bg px-3 py-2 text-sm text-body">
          Esta cuenta de Meta tiene {numeros.length} números. Salud, Números, Plantillas, Webhook, Producción y Costos
          son de toda la cuenta; Agentes y Versiones son de este número.
        </p>
      )}
      {children}
    </div>
  );
}
