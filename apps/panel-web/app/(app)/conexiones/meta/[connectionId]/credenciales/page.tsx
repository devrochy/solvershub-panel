import Link from "next/link";

import { MetaTabs } from "@/app/(app)/conexiones/meta/_components/meta-tabs";
import { CredencialesConexion } from "@/components/domain/credenciales-conexion";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { CampoCredencial } from "@/lib/conexiones";

export const metadata = { title: "Credenciales" };

type Respuesta = { fields: CampoCredencial[] };

/** Datos de registro de una conexión Meta; los secretos se revelan con contraseña. */
export default async function CredencialesMetaPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;
  const res = await apiFetch<Respuesta>(
    `/admin/meta/connections/${encodeURIComponent(connectionId)}/credentials`,
  );

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/conexiones">← Conexiones</Link>
      </Button>

      <PageHeader
        title="Credenciales"
        description="Datos con los que registraste esta conexión. Los secretos se revelan con tu contraseña y se ocultan solos."
      />

      <MetaTabs connectionId={connectionId} current={`/conexiones/meta/${connectionId}/credenciales`} />

      {res.ok ? (
        <CredencialesConexion
          campos={res.data.fields}
          revealUrl={`/api/meta/connections/${encodeURIComponent(connectionId)}/credentials/reveal`}
        />
      ) : (
        <p role="alert" className="text-status-danger-fg">
          No se pudieron cargar las credenciales: {res.error}
        </p>
      )}
    </div>
  );
}
