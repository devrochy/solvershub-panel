import { PruebaTwilio } from "@/app/(app)/conexiones/_components/twilio/prueba-twilio";
import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";
import { puedeEscribirTwilio } from "@/lib/conexion-twilio";

export const metadata = { title: "Prueba" };

/**
 * Mensaje de prueba de un número de WhatsApp vía Twilio (HU-CONN-13): confirma que el número manda mensajes. Solo
 * el propietario o el master la envían.
 */
export default async function PruebaTwilioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await fichaDePestana(id, "prueba");
  if (!ficha) return null;
  const me = await apiFetch<Me>("/admin/me");
  const escribe = me.ok && puedeEscribirTwilio(me.data);

  return (
    <SeccionFicha
      titulo="Enviar un mensaje de prueba"
      descripcion="Manda un texto corto desde este número. WhatsApp solo lo deja salir si ese número le escribió al negocio en las últimas 24 horas."
    >
      {!ficha.conexion.active ? (
        <p className="text-sm text-body">La conexión está pausada: reanúdala para mandar una prueba.</p>
      ) : escribe ? (
        <PruebaTwilio connectionId={id} />
      ) : (
        <p className="text-sm text-body">Solo el propietario del negocio puede mandar pruebas desde este número.</p>
      )}
    </SeccionFicha>
  );
}
