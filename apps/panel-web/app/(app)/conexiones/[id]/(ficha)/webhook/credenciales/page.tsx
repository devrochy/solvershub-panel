import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { CredencialesConexion } from "@/components/domain/credenciales-conexion";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { apiFetch } from "@/lib/api/server";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";
import type { CampoCredencial } from "@/lib/conexiones";

export const metadata = { title: "Datos de la cuenta" };

/** Datos de registro de la cuenta de Meta; los secretos se revelan con contraseña (antes `meta/[id]/credenciales`). */
export default async function CredencialesMetaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await fichaDePestana(id, "webhook");
  const metaId = ficha?.conexion.meta_connection_id;
  if (!metaId) return null;
  const res = await apiFetch<{ fields: CampoCredencial[] }>(`/admin/meta/connections/${encodeURIComponent(metaId)}/credentials`);

  return (
    <SeccionFicha
      titulo="Datos de la cuenta de Meta"
      descripcion="Con estos datos se conectó la cuenta. Para mostrar un secreto te pedimos tu contraseña; se vuelve a ocultar solo."
    >
      {res.ok ? (
        <CredencialesConexion
          campos={res.data.fields}
          revealUrl={`/api/meta/connections/${encodeURIComponent(metaId)}/credentials/reveal`}
        />
      ) : (
        <ErrorDeCarga titulo="No se pudieron cargar los datos de la cuenta" detalle={res.error} />
      )}
    </SeccionFicha>
  );
}
