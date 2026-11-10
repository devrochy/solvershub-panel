"use client";

import { useState } from "react";

import { AccesoDePersona } from "@/app/(app)/colaboradores/_components/acceso-de-persona";
import { GrillaDePermisos } from "@/app/(app)/colaboradores/_components/grilla-de-permisos";
import { Avatar } from "@/components/ui/avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs } from "@/components/ui/tabs";
import type { CollaboratorItem } from "@/lib/api/types";
import { esDueno, puedeActuarSobre, rolDeCuenta } from "@/lib/colaboradores";

export type PestanaDeFicha = "acceso" | "permisos";

/** ¿Tiene permisos propios que cambiar? Un dueño o el master ya lo ven todo. */
export function tienePermisosEditables(persona: CollaboratorItem, esMaster: boolean, secciones: string[]): boolean {
  return puedeActuarSobre(persona, esMaster) && !persona.is_platform_master && !esDueno(persona) && secciones.length > 0;
}

/**
 * Ficha de una persona del equipo (EQU-03): lo suyo en un solo lugar, en dos pestañas. Acceso
 * (si entra, rol, negocios, cobranza y contraseña) y Permisos, cuando tiene permisos propios.
 */
export function FichaDePersona({
  persona,
  secciones,
  esMaster,
  pestanaInicial = "acceso",
  abrirContrasena = false,
  onClose,
}: {
  persona: CollaboratorItem;
  secciones: string[];
  esMaster: boolean;
  pestanaInicial?: PestanaDeFicha;
  abrirContrasena?: boolean;
  onClose: () => void;
}) {
  const conPermisos = tienePermisosEditables(persona, esMaster, secciones);
  const [pestana, setPestana] = useState<PestanaDeFicha>(conPermisos ? pestanaInicial : "acceso");
  const nombre = persona.nombre || persona.email;
  const estado = persona.active ? "Activa" : "Desactivada";

  return (
    <Sheet open onOpenChange={(abierta) => !abierta && onClose()}>
      <SheetContent
        title={nombre}
        description={`${rolDeCuenta(persona)} · ${estado}${persona.nombre ? ` · ${persona.email}` : ""}`}
        antesDelTitulo={<Avatar name={nombre} src={persona.avatar_url ? `/api/avatar/${persona.id}` : null} size="md" />}
        hero={
          conPermisos ? (
            <Tabs
              items={[
                { id: "acceso", label: "Acceso" },
                { id: "permisos", label: "Permisos" },
              ]}
              value={pestana}
              onValueChange={(id) => setPestana(id as PestanaDeFicha)}
            />
          ) : undefined
        }
        className="sm:max-w-xl"
      >
        <div role={conPermisos ? "tabpanel" : undefined} aria-label={conPermisos ? (pestana === "acceso" ? "Acceso" : "Permisos") : undefined}>
          {pestana === "permisos" && conPermisos ? (
            <GrillaDePermisos collaborator={persona} secciones={secciones} esMaster={esMaster} />
          ) : (
            <AccesoDePersona
              persona={persona}
              puedeActuar={puedeActuarSobre(persona, esMaster)}
              esMaster={esMaster}
              abrirContrasena={abrirContrasena}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
