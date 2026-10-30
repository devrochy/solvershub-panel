"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { CollectorPermissionsDialog } from "@/app/(app)/cobranza/_components/collector-permissions-dialog";
import { Badge } from "@/components/ui/badge";
import type { CollaboratorItem } from "@/lib/api/types";
import { perfilDePack } from "@/lib/colaboradores";

/**
 * Perfiles que los packs tienen de la cuenta (ADR-0176): hoy el gestor de cobranza, con su estatus,
 * sus carteras (lectura, se asignan en Cobranza › Gestores) y cuántos de sus permisos de campo tiene.
 * Editar los permisos reutiliza el diálogo de cobranza; un tipo de edición que el panel no conoce, o un
 * detalle recortado por falta de acceso, se queda en lectura.
 */
export function PerfilesDePack({ colaborador }: { colaborador: CollaboratorItem }) {
  const router = useRouter();
  const perfiles = (colaborador.pack_profiles ?? []).map(perfilDePack);
  if (perfiles.length === 0) return <span className="text-xs text-text-soft">—</span>;
  const nombre = colaborador.nombre || colaborador.email;

  return (
    <div className="flex flex-col gap-1.5">
      {perfiles.map((perfil) => (
        <div key={perfil.clave} className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">{perfil.etiqueta}</Badge>
            {perfil.detalle?.estatus && (
              <span className="text-xs capitalize text-text-soft">{perfil.detalle.estatus}</span>
            )}
          </div>
          {perfil.detalle && (
            <p className="text-xs text-text-soft">
              {perfil.detalle.carteras.length === 0 ? (
                "Sin carteras"
              ) : (
                <span title={perfil.detalle.carteras.map((c) => c.nombre).join(", ")}>
                  {perfil.detalle.carteras.length === 1
                    ? perfil.detalle.carteras[0].nombre
                    : `${perfil.detalle.carteras.length} carteras`}
                </span>
              )}
              {" · "}
              <Link className="text-link hover:underline" href="/cobranza/gestores">
                Asignar
              </Link>
            </p>
          )}
          {perfil.detalle?.permisos && (
            <p className="text-xs text-text-soft">
              <span className="tabular-nums">
                {perfil.detalle.permisos.activos} de {perfil.detalle.permisos.total}
              </span>{" "}
              permisos de campo
              {perfil.edicion && (
                <>
                  {" · "}
                  <CollectorPermissionsDialog
                    collectorId={perfil.edicion.refId}
                    nombre={nombre}
                    onSaved={() => router.refresh()}
                    trigger={
                      <button
                        type="button"
                        className="text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        aria-label={`Permisos de campo de ${nombre}`}
                      >
                        Editar
                      </button>
                    }
                  />
                </>
              )}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
