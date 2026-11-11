"use client";

import { useState } from "react";

import { useReenviarLink, type CargoParaAccion } from "@/app/(app)/suscripciones/_components/reenviar-link";
import { RegistrarPago } from "@/app/(app)/suscripciones/_components/registrar-pago";
import { MenuDeFila } from "@/components/domain/menu-de-fila";
import { DropdownMenuItem, DropdownMenuLinkItem } from "@/components/ui/dropdown-menu";
import { mesLegible } from "@/lib/suscripciones-admin";

/**
 * Las acciones de un cobro pendiente en «Más acciones» (SUS-08, SUS-12): reenviar el link y
 * registrar una transferencia. El diálogo vive fuera del menú: se abre después de que el menú
 * se cierra. `suscripcionHref` agrega «Abrir la suscripción» (en Pagos, donde la fila ya la abre
 * con el mouse; el menú la deja a mano en el celular). Un cobro que no se opera no lleva menú.
 */
export function AccionesDeCobro({
  cargo,
  cliente,
  puedeEscribir,
  suscripcionHref,
}: {
  cargo: CargoParaAccion & { estado: string; tipo: string };
  cliente: string;
  puedeEscribir: boolean;
  suscripcionHref?: string;
}) {
  const [registrando, setRegistrando] = useState(false);
  const { reenviar, pending } = useReenviarLink(cargo, cliente);
  const operable = puedeEscribir && cargo.estado === "pendiente" && cargo.tipo === "periodo";
  if (!operable) return null;
  return (
    <>
      <MenuDeFila etiqueta={`Más acciones del cobro de ${mesLegible(cargo.periodo)} de ${cliente}`}>
        <DropdownMenuItem onSelect={() => void reenviar()} disabled={pending}>
          Reenviar link de pago
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setRegistrando(true)}>Registrar transferencia</DropdownMenuItem>
        {suscripcionHref && <DropdownMenuLinkItem href={suscripcionHref}>Abrir la suscripción</DropdownMenuLinkItem>}
      </MenuDeFila>
      <RegistrarPago cargo={cargo} cliente={cliente} boton="ninguno" abierto={registrando} onAbierto={setRegistrando} />
    </>
  );
}
