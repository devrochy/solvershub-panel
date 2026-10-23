"use client";

import Link from "next/link";

import { ConnectionActions } from "@/app/(app)/conexiones/_components/connection-actions";
import { Button } from "@/components/ui/button";
import { gestionDeConexion, type ConexionConsola } from "@/lib/conexiones";

/**
 * Acción «Gestionar» de una tarjeta: lleva al hub de la conexión según su tipo.
 * Las manuales abren el diálogo con datos, credenciales y eliminación.
 */
export function GestionConexion({
  conexion,
  canEdit,
}: {
  conexion: ConexionConsola;
  canEdit: boolean;
}) {
  const destino = gestionDeConexion(conexion);
  if (!destino) return null;
  if (destino.tipo === "enlace") {
    return (
      <span className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={destino.href}>{destino.label}</Link>
        </Button>
        {canEdit && conexion.type_id !== "webchat" && (
          <ConnectionActions
            connectionId={conexion.id}
            label={conexion.label}
            active={conexion.active}
            primary={conexion.is_primary}
            kind={conexion.meta_connection_id ? "meta_connection" : "channel_connection"}
            typeId={conexion.type_id}
            trigger="icon"
          />
        )}
      </span>
    );
  }
  if (!canEdit) return null;
  return (
    <ConnectionActions
      connectionId={conexion.id}
      label={conexion.label}
      active={conexion.active}
      primary={conexion.is_primary}
      kind={conexion.meta_connection_id ? "meta_connection" : "channel_connection"}
      typeId={conexion.type_id}
      manual
      trigger="button"
      triggerLabel="Gestionar"
    />
  );
}
