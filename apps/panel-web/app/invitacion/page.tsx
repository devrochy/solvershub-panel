import { InvitacionForm } from "@/app/invitacion/_components/invitacion-form";
import { TarjetaDeAcceso } from "@/components/domain/tarjeta-de-acceso";

export const metadata = { title: "Activa tu cuenta", referrer: "no-referrer" };

/**
 * Enlace de la invitación del dueño (HU-SH-06, ADR-0121): `/invitacion#<token>`. El token va
 * en el fragmento, que el navegador no manda al servidor: lo lee el formulario.
 */
export default function InvitacionPage() {
  return (
    <TarjetaDeAcceso
      titulo="Activa tu cuenta"
      descripcion="Define tu contraseña para entrar a tu negocio en SolversHub."
    >
      <InvitacionForm />
    </TarjetaDeAcceso>
  );
}
