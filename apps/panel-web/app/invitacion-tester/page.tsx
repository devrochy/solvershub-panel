import { InvitacionForm } from "@/app/invitacion/_components/invitacion-form";
import { TarjetaDeAcceso } from "@/components/domain/tarjeta-de-acceso";
import { SCRIPT_QUE_GUARDA_EL_TOKEN } from "@/lib/acceso";

export const metadata = { title: "Activa tu cuenta de tester", referrer: "no-referrer" };

/**
 * Enlace de la invitación de un tester (SPEC-30, HU-QA-04): `/invitacion-tester#<token>`. El
 * token va en el fragmento, que el navegador no manda al servidor. Al guardar entra directo a
 * Pruebas.
 */
export default function InvitacionTesterPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SCRIPT_QUE_GUARDA_EL_TOKEN }} />
      <TarjetaDeAcceso
        titulo="Activa tu cuenta de tester"
        descripcion="Define tu contraseña para probar SolversHub en el entorno de pruebas."
      >
        <InvitacionForm endpoint="/api/invitacion-tester" destino="/pruebas" />
      </TarjetaDeAcceso>
    </>
  );
}
