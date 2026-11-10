import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { CredencialesConexion } from "@/components/domain/credenciales-conexion";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { apiFetch } from "@/lib/api/server";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";
import type { CampoCredencial } from "@/lib/conexiones";

export const metadata = { title: "Credenciales" };

/**
 * Datos de acceso de una conexión manual (correo, Twilio, Plivo). Editarlos o eliminar la
 * conexión está en el menú de la cabecera.
 */
export default async function CredencialesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await fichaDePestana(id, "credenciales");
  if (!ficha) return null;
  const res = await apiFetch<{ fields: CampoCredencial[] }>(`/admin/connections/${encodeURIComponent(id)}/credentials`);

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
    </SeccionFicha>
  );
}
