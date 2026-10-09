import { RecuperarForm } from "@/app/recuperar/_components/recuperar-form";
import { TarjetaDeAcceso } from "@/components/domain/tarjeta-de-acceso";

export const metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <TarjetaDeAcceso
      titulo="Recupera tu contraseña"
      descripcion="Te enviamos un código a tu correo para que definas una contraseña nueva."
    >
      <RecuperarForm />
    </TarjetaDeAcceso>
  );
}
