import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { ConnectionActions } from "@/app/(app)/conexiones/_components/connection-actions";
import { PausarConexion } from "@/app/(app)/conexiones/_components/pausar-conexion";
import { PestanasFicha } from "@/app/(app)/conexiones/_components/pestanas-ficha";
import { ChannelIcon } from "@/components/domain/channel-icon";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { estadoDeConexion, iconoDeConexion, numerosDeLaCuenta, pestanasDeFicha, subtituloDeFicha } from "@/lib/conexion-ficha";
import { cargarFicha } from "@/lib/conexion-ficha-servidor";
import { puedePausar, textoConfirmarPausa } from "@/lib/conexiones";

/**
 * Ficha de una conexión (HU-UX-09, D-37): migas «Conexiones › nombre», ícono y estado junto al
 * nombre, tipo y detalle debajo, Pausar y el menú de acciones, y las pestañas de su tipo. Cada
 * pestaña es una ruta.
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
      <div className="flex flex-col gap-6">
        <PageHeader title="Conexión" breadcrumbs={[{ label: "Conexiones", href: "/conexiones" }, { label: "Conexión" }]} tabs={false} />
        <ErrorDeCarga titulo="No se pudo cargar la conexión" detalle={res.error} />
      </div>
    );
  }
  if (!res.ficha) notFound();
  const { conexion: c, tipo, consola } = res.ficha;
  const estado = estadoDeConexion(c);
  const numeros = tipo === "whatsapp_meta" ? numerosDeLaCuenta(consola.items, c.meta_connection_id) : [];
  const descripcion = [subtituloDeFicha(c, tipo), numeros.length > 1 ? `Cuenta de Meta con ${numeros.length} números` : null]
    .filter(Boolean)
    .join(" · ");
  const pestanas = pestanasDeFicha(c.id, tipo);
  const pausable = puedePausar(c, consola.can_edit);
  const manual = tipo === "smtp" || tipo === "manual";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={c.label}
        antesDelTitulo={<ChannelIcon id={iconoDeConexion(c)} />}
        despuesDelTitulo={<Badge variant={estado.tono}>{estado.label}</Badge>}
        description={descripcion}
        breadcrumbs={[{ label: "Conexiones", href: "/conexiones" }, { label: c.label }]}
        actions={
          consola.can_edit ? (
            <>
              {pausable && (
                <PausarConexion
                  id={c.meta_connection_id ?? c.id}
                  tipo={c.meta_connection_id ? "meta_connection" : "channel"}
                  pausada={c.health === "paused"}
                  textoConfirmacion={textoConfirmarPausa(c)}
                />
              )}
              <ConnectionActions
                connectionId={c.meta_connection_id ?? c.id}
                label={c.label}
                active={c.active}
                primary={c.is_primary}
                kind={c.meta_connection_id ? "meta_connection" : "channel_connection"}
                typeId={c.type_id}
                manual={manual}
                conActivar={!pausable}
                redirectTo="/conexiones"
              />
            </>
          ) : undefined
        }
        tabs={pestanas.length > 1 ? <PestanasFicha items={pestanas} /> : false}
      />
      {children}
    </div>
  );
}
