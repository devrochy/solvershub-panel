"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { CollaboratorItem } from "@/lib/api/types";
import { GrillaDePermisos } from "@/app/(app)/colaboradores/_components/grilla-de-permisos";
import { CollaboratorActions } from "@/app/(app)/colaboradores/_components/collaborator-actions";
import { PerfilesDePack } from "@/app/(app)/colaboradores/_components/perfiles-de-pack";
import { EstadoDeColaborador } from "@/app/(app)/colaboradores/_components/estado-de-colaborador";
import { puedeActuarSobre } from "@/lib/colaboradores";
import { rolLabel } from "@/lib/labels";

/**
 * Equipo: cuentas del negocio activo. Avatar con iniciales, permisos como chip que abre la
 * grilla (ver y gestionar), estado con interruptor y acciones por icono. El master puede ver
 * todas las cuentas de la plataforma con «Todas las cuentas».
 */
export function TablaDeColaboradores({
  filas,
  secciones,
  esMaster,
}: {
  filas: CollaboratorItem[];
  /** Secciones que se pueden otorgar o revocar desde esta sesión. */
  secciones: string[];
  esMaster: boolean;
}) {
  const [todas, setTodas] = useState(false);
  const [todasFilas, setTodasFilas] = useState<CollaboratorItem[] | null>(null);
  const [cargandoTodas, setCargandoTodas] = useState(false);
  const [permisosDe, setPermisosDe] = useState<CollaboratorItem | null>(null);
  // Con «Todas las cuentas» apagado se muestran SIEMPRE las filas del servidor, así un
  // `router.refresh()` (por ejemplo al cambiar el estado) se ve al instante.
  const actuales = todas && todasFilas ? todasFilas : filas;

  async function alternarTodas(verTodas: boolean) {
    setTodas(verTodas);
    if (!verTodas) {
      setTodasFilas(null);
      return;
    }
    setCargandoTodas(true);
    try {
      const res = await fetch("/api/collaborators?todos=1");
      const json = (await res.json().catch(() => null)) as CollaboratorItem[] | null;
      if (Array.isArray(json)) setTodasFilas(json);
    } finally {
      setCargandoTodas(false);
    }
  }

  // La columna solo existe si alguna cuenta tiene perfil de un pack: sin cobranza no aparece vacía.
  const hayPerfiles = actuales.some((c) => (c.pack_profiles ?? []).length > 0);

  const columns: Column<CollaboratorItem>[] = [
    {
      key: "cuenta",
      header: "Cuenta",
      cell: (c) => (
        <div className="flex items-center gap-3">
          <Avatar name={c.nombre || c.email} src={c.avatar_url ? `/api/avatar/${c.id}` : null} size="md" />
          <div className="flex min-w-0 flex-col">
            <span className="flex items-center gap-2 truncate font-medium text-headline">
              {c.nombre || c.email}
              {c.is_self && <Badge variant="neutral">tú</Badge>}
            </span>
            <span className="truncate text-xs text-text-soft">
              {c.nombre ? c.email : c.username || "—"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "rol",
      header: "Rol",
      cell: (c) => (
        <Badge variant={c.is_platform_master ? "accent" : "neutral"}>
          {c.is_platform_master ? rolLabel("master") : rolLabel(c.role)}
        </Badge>
      ),
    },
    ...(hayPerfiles
      ? [
          {
            key: "perfil",
            header: "Perfil",
            info: "Perfil que un módulo tiene de la cuenta, como el gestor de cobranza: estatus, carteras y permisos de campo.",
            cell: (c: CollaboratorItem) => <PerfilesDePack colaborador={c} />,
          } satisfies Column<CollaboratorItem>,
        ]
      : []),
    {
      key: "estado",
      header: "Estado",
      cell: (c) => (
        <EstadoDeColaborador
          key={`${c.id}-${c.active}`}
          collaborator={c}
          puedeActuar={puedeActuarSobre(c, esMaster)}
        />
      ),
    },
    {
      key: "permisos",
      header: "Permisos",
      info: "Permisos por sección en este negocio, además de los de su rol. Toca para verlos y gestionarlos.",
      cell: (c) => (
        <button
          type="button"
          onClick={() => setPermisosDe(c)}
          aria-label={`Permisos de ${c.nombre || c.email}`}
          className="group inline-flex items-center gap-2 rounded-full border border-border-soft bg-surface-2 px-2.5 py-1 text-xs text-body transition-colors hover:border-border-strong hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <ShieldCheck aria-hidden className="h-3.5 w-3.5 text-text-soft transition-colors group-hover:text-link" />
          <span className="tabular-nums">{c.permissions.length === 0 ? "De su rol" : `${c.permissions.length}`}</span>
          <span className="text-link group-hover:underline">Gestionar</span>
        </button>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (c) =>
        puedeActuarSobre(c, esMaster) ? (
          <CollaboratorActions collaborator={c} esMaster={esMaster} />
        ) : (
          <span className="text-xs text-text-soft">—</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {esMaster && (
        <div className="flex justify-end">
          <Checkbox
            id="ver-todas"
            label={cargandoTodas ? "Cargando…" : "Todas las cuentas"}
            checked={todas}
            disabled={cargandoTodas}
            onCheckedChange={(v) => void alternarTodas(v)}
          />
        </div>
      )}
      <DataTable
        columns={columns}
        rows={actuales}
        getRowKey={(c) => c.id}
        density="comfortable"
        emptyTitle="Sin equipo todavía"
        emptyDescription="Invita a tu equipo para que gestionen el panel contigo."
      />

      <Dialog open={permisosDe !== null} onOpenChange={(o) => !o && setPermisosDe(null)}>
        <DialogContent
          title="Permisos"
          description={permisosDe ? `${permisosDe.nombre || permisosDe.email}` : ""}
          className="max-w-2xl"
        >
          {permisosDe && (
            <div className="max-h-[70vh] overflow-y-auto pr-1">
              <GrillaDePermisos collaborator={permisosDe} secciones={secciones} esMaster={esMaster} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
