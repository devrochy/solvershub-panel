"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useAlternarAcceso } from "@/app/(app)/colaboradores/_components/acceso-de-persona";
import {
  FichaDePersona,
  tienePermisosEditables,
  type PestanaDeFicha,
} from "@/app/(app)/colaboradores/_components/ficha-de-persona";
import { MenuDeFila } from "@/components/domain/menu-de-fila";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { Column } from "@/components/ui/data-table";
import { DropdownMenuItem, DropdownMenuLinkItem } from "@/components/ui/dropdown-menu";
import type { CollaboratorItem } from "@/lib/api/types";
import { puedeActuarSobre, resumenDePerfiles, resumenDePermisos, rolDeCuenta } from "@/lib/colaboradores";

export type FichaAbierta = { id: string; pestana: PestanaDeFicha; contrasena: boolean };

/** Enlace a la ficha: viaja en la URL, así se puede compartir y el botón Atrás la cierra. */
export function hrefDeFicha(id: string, pestana: PestanaDeFicha = "acceso", contrasena = false): string {
  const query = new URLSearchParams({ persona: id });
  if (pestana !== "acceso") query.set("pestana", pestana);
  if (contrasena) query.set("abrir", "contrasena");
  return `/colaboradores?${query.toString()}`;
}

function EstadoDeCuenta({ activa }: { activa: boolean }) {
  return <Badge variant={activa ? "success" : "neutral"}>{activa ? "Activa" : "Desactivada"}</Badge>;
}

/** Acciones de la fila con nombre (EQU-08): la ficha, los permisos, la contraseña y el acceso. */
function AccionesDePersona({
  persona,
  esMaster,
  secciones,
}: {
  persona: CollaboratorItem;
  esMaster: boolean;
  secciones: string[];
}) {
  const { alternar } = useAlternarAcceso(persona);
  const nombre = persona.nombre || persona.email;
  return (
    <MenuDeFila etiqueta={`Más acciones de ${nombre}`}>
      <DropdownMenuLinkItem href={hrefDeFicha(persona.id)} scroll={false}>Ver el acceso y los negocios</DropdownMenuLinkItem>
      {tienePermisosEditables(persona, esMaster, secciones) && (
        <DropdownMenuLinkItem href={hrefDeFicha(persona.id, "permisos")} scroll={false}>Ver los permisos</DropdownMenuLinkItem>
      )}
      <DropdownMenuLinkItem href={hrefDeFicha(persona.id, "acceso", true)} scroll={false}>Restablecer la contraseña</DropdownMenuLinkItem>
      {!persona.is_self &&
        (persona.active ? (
          <DropdownMenuItem tone="danger" onSelect={() => void alternar(false)}>
            Desactivar el acceso
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => void alternar(true)}>Activar el acceso</DropdownMenuItem>
        ))}
    </MenuDeFila>
  );
}

/**
 * Equipo (EQU-01, 02, 04, 08, 09 y 12): una fila por persona con su rol y su estado en palabras,
 * un resumen de permisos y de Cobranza, y un menú con las acciones escritas. La fila abre su
 * ficha. En el celular, una fila de un toque. El master puede ver todas las cuentas.
 */
export function TablaDeColaboradores({
  filas,
  secciones,
  esMaster,
  abierta = null,
}: {
  filas: CollaboratorItem[];
  /** Secciones que se pueden otorgar o revocar desde esta sesión. */
  secciones: string[];
  esMaster: boolean;
  /** Ficha abierta según la URL (`?persona=`). */
  abierta?: FichaAbierta | null;
}) {
  const router = useRouter();
  const [todas, setTodas] = useState(false);
  const [todasFilas, setTodasFilas] = useState<CollaboratorItem[] | null>(null);
  const [cargandoTodas, setCargandoTodas] = useState(false);
  // Con «Todas las cuentas» apagado se muestran SIEMPRE las filas del servidor, así un
  // `router.refresh()` (por ejemplo al cambiar el estado) se ve al instante.
  const actuales = todas && todasFilas ? todasFilas : filas;
  const personaAbierta = abierta ? actuales.find((c) => c.id === abierta.id) ?? filas.find((c) => c.id === abierta.id) : undefined;

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
  const nombreDe = (c: CollaboratorItem) => c.nombre || c.email;
  const acciones = (c: CollaboratorItem) =>
    puedeActuarSobre(c, esMaster) ? <AccionesDePersona persona={c} esMaster={esMaster} secciones={secciones} /> : null;

  const columns: Column<CollaboratorItem>[] = [
    {
      key: "persona",
      header: "Persona",
      cell: (c) => (
        <div className="flex items-center gap-3">
          <Avatar name={nombreDe(c)} src={c.avatar_url ? `/api/avatar/${c.id}` : null} size="md" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-headline">
              {nombreDe(c)}
              {c.is_self && <span className="font-normal text-text-soft"> (tú)</span>}
            </span>
            {c.nombre && <span className="truncate text-xs text-text-soft">{c.email}</span>}
          </div>
        </div>
      ),
    },
    { key: "rol", header: "Rol", cell: (c) => rolDeCuenta(c) },
    { key: "estado", header: "Estado", cell: (c) => <EstadoDeCuenta activa={c.active} /> },
    {
      key: "permisos",
      header: "Permisos",
      cell: (c) => {
        const resumen = resumenDePermisos(c);
        return <span className={resumen === "Según su rol" ? "text-text-soft" : "text-body"}>{resumen}</span>;
      },
    },
    ...(hayPerfiles
      ? [{ key: "cobranza", header: "En Cobranza", cell: (c: CollaboratorItem) => resumenDePerfiles(c) } satisfies Column<CollaboratorItem>]
      : []),
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      className: "relative z-10 w-12",
      cell: (c) => acciones(c),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {esMaster && (
        <div className="flex justify-end">
          <Checkbox
            id="ver-todas"
            label="Todas las cuentas"
            checked={todas}
            disabled={cargandoTodas}
            onCheckedChange={(v) => void alternarTodas(v)}
          />
        </div>
      )}
      <TablaResponsiva
        etiqueta="Personas del equipo"
        caption="Personas del equipo"
        columns={columns}
        rows={actuales}
        loading={cargandoTodas}
        getRowKey={(c) => c.id}
        getRowHref={(c) => hrefDeFicha(c.id)}
        getRowLabel={(c) => `Abrir la ficha de ${nombreDe(c)}`}
        scrollAlAbrir={false}
        density="comfortable"
        emptyTitle="Por ahora no hay nadie más"
        emptyDescription="Invita a quien te ayuda con el negocio. Tú eliges qué puede ver y qué puede cambiar."
        filaCelular={(c) => ({
          inicio: <Avatar name={nombreDe(c)} src={c.avatar_url ? `/api/avatar/${c.id}` : null} size="md" />,
          titulo: `${nombreDe(c)}${c.is_self ? " (tú)" : ""}`,
          detalle: `${rolDeCuenta(c)} · ${c.active ? "Activa" : "Desactivada"}`,
          href: hrefDeFicha(c.id),
          accion: acciones(c),
        })}
      />
      <p className="text-xs text-text-soft">Toca una persona para ver y cambiar su acceso, sus permisos y sus negocios.</p>

      {personaAbierta && abierta && (
        <FichaDePersona
          key={`${abierta.id}-${abierta.pestana}-${abierta.contrasena}`}
          persona={personaAbierta}
          secciones={secciones}
          esMaster={esMaster}
          pestanaInicial={abierta.pestana}
          abrirContrasena={abierta.contrasena}
          onClose={() => router.replace("/colaboradores", { scroll: false })}
        />
      )}
    </div>
  );
}
