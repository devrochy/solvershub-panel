import Link from "next/link";

import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { CredencialesConexion } from "@/components/domain/credenciales-conexion";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/server";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";
import type { CampoCredencial } from "@/lib/conexiones";

export const metadata = { title: "Credenciales" };

/** Datos de registro de la cuenta de Meta; los secretos se revelan con contraseña (antes `meta/[id]/credenciales`). */
export default async function CredencialesMetaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await fichaDePestana(id, "webhook");
  const metaId = ficha?.conexion.meta_connection_id;
  if (!metaId) return null;
  const res = await apiFetch<{ fields: CampoCredencial[] }>(`/admin/meta/connections/${encodeURIComponent(metaId)}/credentials`);

  return (
    <SeccionFicha
      titulo="Credenciales de la cuenta"
      descripcion="Datos con los que registraste esta cuenta de Meta. Los secretos se revelan con tu contraseña y se ocultan solos."
      acciones={
        <Button asChild variant="ghost" size="sm">
          <Link href={`/conexiones/${id}/webhook`}>← Volver a Webhook</Link>
        </Button>
      }
    >
      {res.ok ? (
        <CredencialesConexion
          campos={res.data.fields}
          revealUrl={`/api/meta/connections/${encodeURIComponent(metaId)}/credentials/reveal`}
        />
      ) : (
        <p role="alert" className="text-status-danger-fg">
          No se pudieron cargar las credenciales: {res.error}
        </p>
      )}
    </SeccionFicha>
  );
}
