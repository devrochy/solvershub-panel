"use client";

import { useRef } from "react";
import { MessageCircle, Phone, Send } from "lucide-react";

import { MenuDeFila } from "@/components/domain/menu-de-fila";
import {
  DropdownMenuExternalLinkItem,
  DropdownMenuItem,
  DropdownMenuLinkItem,
} from "@/components/ui/dropdown-menu";
import { enlaceTelefono, enlaceWhatsApp } from "@/lib/clientes";
import type { LeadRow } from "@/lib/api/types";
import { EnviarPlantilla } from "@/app/(app)/leads/_components/enviar-plantilla";

/**
 * Acciones de una fila de Clientes en el menú de 3 puntos del panel. Los ítems llevan icono y texto;
 * la ficha se abre desde la fila, así que aquí no hay «Ver ficha».
 */
export function AccionesDeFila({
  lead,
  puedeEnviar,
}: {
  lead: LeadRow;
  puedeEnviar: boolean;
}) {
  const nombre = lead.perfil.nombre_visible;
  const telefono = enlaceTelefono(lead.perfil);
  const whatsapp = enlaceWhatsApp(lead.perfil);
  const enviar = useRef<HTMLButtonElement>(null);
  if (!telefono && !whatsapp && !puedeEnviar) return <span className="text-text-soft">—</span>;

  return (
    <>
      <MenuDeFila etiqueta={`Más acciones de ${nombre}`}>
        {whatsapp && (
          <DropdownMenuExternalLinkItem
            href={whatsapp}
            avisoNuevaPestana="se abre en WhatsApp en una pestaña nueva"
          >
            <MessageCircle aria-hidden className="h-4 w-4" />
            Escribir por WhatsApp
          </DropdownMenuExternalLinkItem>
        )}
        {telefono && (
          <DropdownMenuLinkItem href={telefono}>
            <Phone aria-hidden className="h-4 w-4" />
            Llamar
          </DropdownMenuLinkItem>
        )}
        {puedeEnviar && (
          <DropdownMenuItem icon={<Send aria-hidden />} onSelect={() => enviar.current?.click()}>
            Enviar plantilla
          </DropdownMenuItem>
        )}
      </MenuDeFila>
      {puedeEnviar && (
        <EnviarPlantilla
          consulta=""
          cliente={{ id: lead.id, nombre }}
          trigger={
            <span aria-hidden className="sr-only">
              <button ref={enviar} type="button" tabIndex={-1} />
            </span>
          }
        />
      )}
    </>
  );
}
