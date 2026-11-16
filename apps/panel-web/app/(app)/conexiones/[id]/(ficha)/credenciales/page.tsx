import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { RotarTokenTelegram } from "@/app/(app)/conexiones/_components/telegram/rotar-token-telegram";
import { RotarCredencialesTwilio } from "@/app/(app)/conexiones/_components/twilio/rotar-credenciales-twilio";
import { CredencialesConexion } from "@/components/domain/credenciales-conexion";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";
import { puedeEscribirTelegram } from "@/lib/conexion-telegram";
import { puedeEscribirTwilio, type ConexionTwilio } from "@/lib/conexion-twilio";
import type { CampoCredencial } from "@/lib/conexiones";

export const metadata = { title: "Credenciales" };

/**
 * Datos de acceso de una conexión manual (correo, Plivo), de WhatsApp vía Twilio o de un bot de Telegram (el token,
 * que se cambia aquí con la contraseña). En las manuales, editarlos
 * o eliminar la conexión está en el menú de la cabecera; en Twilio, el propietario o el master cambian el Auth
 * Token aquí mismo (con su contraseña, HU-CONN-13).
 */
export default async function CredencialesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await fichaDePestana(id, "credenciales");
  if (!ficha) return null;
  const twilio = ficha.tipo === "whatsapp_twilio";
  const telegram = ficha.tipo === "telegram";
  const [res, twilioRes, me] = await Promise.all([
    apiFetch<{ fields: CampoCredencial[] }>(`/admin/connections/${encodeURIComponent(id)}/credentials`),
    twilio ? apiFetch<ConexionTwilio>(`/admin/connections/twilio/${encodeURIComponent(id)}`) : null,
    twilio || telegram ? apiFetch<Me>("/admin/me") : null,
  ]);
  const rota = twilio && twilioRes?.ok && me?.ok && puedeEscribirTwilio(me.data) ? twilioRes.data : null;
  const rotaTelegram = telegram && me?.ok && puedeEscribirTelegram(me.data);

  return (
    <SeccionFicha
      titulo="Datos de acceso"
      descripcion="Para mostrar un secreto te pedimos tu contraseña; se vuelve a ocultar solo."
    >
      {res.ok ? (
        <CredencialesConexion
          campos={res.data.fields}
          revealUrl={`/api/connections/${encodeURIComponent(id)}/credentials/reveal`}
        />
      ) : (
        <ErrorDeCarga titulo="No se pudieron cargar los datos de acceso" detalle={res.error} />
      )}
      {rotaTelegram && (
        <Card>
          <CardHeader>
            <CardTitle as="h3">Cambiar el token del bot</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-body">
              Si revocaste el token en @BotFather (o lo cambiaste por seguridad), pega el nuevo. Tiene que ser del mismo
              bot; lo validamos con Telegram antes de guardarlo y una conexión pausada no se cambia.
            </p>
            <RotarTokenTelegram connectionId={id} />
          </CardContent>
        </Card>
      )}
      {rota && (
        <Card>
          <CardHeader>
            <CardTitle as="h3">Cambiar el Auth Token</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-body">
              Si cambiaste el Auth Token en Twilio (o lo rotaste por seguridad), pega el nuevo. Lo validamos con Twilio
              antes de guardarlo; una conexión pausada no se cambia.
            </p>
            <RotarCredencialesTwilio connectionId={rota.connection_id} accountSid={rota.account_sid} />
          </CardContent>
        </Card>
      )}
    </SeccionFicha>
  );
}
