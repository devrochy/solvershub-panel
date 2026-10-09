import { InvitacionForm } from "@/app/invitacion/_components/invitacion-form";
import { TarjetaDeAcceso } from "@/components/domain/tarjeta-de-acceso";
import { SCRIPT_QUE_GUARDA_EL_TOKEN } from "@/lib/acceso";

export const metadata = { title: "Activa tu cuenta", referrer: "no-referrer" };

/**
 * Enlace de la invitación del dueño (HU-SH-06, ADR-0121): `/invitacion#<token>`. El token va
 * en el fragmento, que el navegador no manda al servidor: lo lee el formulario.
 */
export default function InvitacionPage() {
  return (
    <>
      {/* Guarda el token y lo borra de la URL antes de hidratar (ver `lib/acceso.ts`). */}
      <script dangerouslySetInnerHTML={{ __html: SCRIPT_QUE_GUARDA_EL_TOKEN }} />
      <TarjetaDeAcceso
        titulo="Activa tu cuenta"
        descripcion="Define tu contraseña para entrar a tu negocio en SolversHub."
      >
        <InvitacionForm />
      </TarjetaDeAcceso>
    </>
  );
}
