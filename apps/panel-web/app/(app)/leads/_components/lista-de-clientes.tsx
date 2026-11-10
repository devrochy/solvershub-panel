import Link from "next/link";
import { Send } from "lucide-react";

import { EnviarPlantilla } from "@/app/(app)/leads/_components/enviar-plantilla";
import { AgenteSwitch } from "@/components/domain/cliente/agente-switch";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { LeadsResponse } from "@/lib/api/types";
import { etiquetaClasificacion, hrefFicha, telefonoVisible } from "@/lib/clientes";

type LeadRow = LeadsResponse["items"][number];

/** Clientes en el celular: una fila por persona que abre su ficha, con el agente a la mano. */
export function ListaDeClientes({
  clientes,
  qs,
  puedeEnviar,
}: {
  clientes: LeadRow[];
  qs: URLSearchParams;
  puedeEnviar: boolean;
}) {
  return (
    <ul aria-label="Clientes" className="overflow-hidden rounded-lg border border-border-soft bg-surface md:hidden">
      {clientes.map((lead) => {
        const nombre = lead.perfil.nombre_visible;
        const telefono = telefonoVisible(lead.perfil);
        const clasificacion = etiquetaClasificacion(lead.perfil.clasificacion, lead.perfil.clasificacion_label);
        return (
          <li key={lead.id} className="relative flex min-h-18 items-center gap-3 border-b border-border-soft px-4 py-3 last:border-b-0">
            <Avatar name={nombre} src={lead.perfil.avatar_url} size="md" />
            <div className="flex min-w-0 flex-1 flex-col">
              <Link
                href={hrefFicha(lead.id, { qs })}
                scroll={false}
                className="truncate text-sm font-medium text-headline outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus"
              >
                {nombre}
              </Link>
              <span className="truncate text-xs text-text-soft">
                {telefono === "—" ? clasificacion : `${telefono} · ${clasificacion}`}
              </span>
            </div>
            <div className="relative z-10 flex items-center gap-1">
              {puedeEnviar && lead.agentes.includes("ventas") && (
                <EnviarPlantilla
                  consulta=""
                  cliente={{ id: lead.id, nombre }}
                  trigger={
                    <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Enviar plantilla a ${nombre}`}>
                      <Send className="h-4 w-4" aria-hidden />
                    </Button>
                  }
                />
              )}
              <AgenteSwitch leadId={lead.id} botPaused={lead.bot_paused ?? false} nombre={nombre} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
