"use client";

import Link from "next/link";

import { ConnectionActions } from "@/app/(app)/conexiones/_components/connection-actions";
import { Button } from "@/components/ui/button";
import { gestionDeConexion, type ConexionConsola } from "@/lib/conexiones";

/**
 * Acción «Gestionar» de una tarjeta: lleva al hub de la conexión según su tipo.
 * Las conexiones manuales abren el formulario de credenciales (solo con permiso de edición).
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
      <Button asChild variant="outline" size="sm">
        <Link href={destino.href}>{destino.label}</Link>
      </Button>
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
      trigger="button"
      triggerLabel="Gestionar"
    />
  );
}
