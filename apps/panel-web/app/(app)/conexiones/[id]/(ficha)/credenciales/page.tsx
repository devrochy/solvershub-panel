import { ConnectionActions } from "@/app/(app)/conexiones/_components/connection-actions";
import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { CredencialesConexion } from "@/components/domain/credenciales-conexion";
import { apiFetch } from "@/lib/api/server";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";
import type { CampoCredencial } from "@/lib/conexiones";

export const metadata = { title: "Credenciales" };

/**
 * Credenciales de una conexión manual (SMTP, Twilio, Plivo): los datos con los que se registró,
 * los secretos con contraseña, y editar, pausar o eliminar (antes el diálogo «Gestionar»).
 */
export default async function CredencialesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await fichaDePestana(id, "credenciales");
  if (!ficha) return null;
  const c = ficha.conexion;
  const res = await apiFetch<{ fields: CampoCredencial[] }>(`/admin/connections/${encodeURIComponent(id)}/credentials`);

  return (
    <SeccionFicha
      titulo="Credenciales"
      descripcion="Datos con los que registraste esta conexión. Los secretos se revelan con tu contraseña y se ocultan solos."
      acciones={
        ficha.consola.can_edit ? (
          <ConnectionActions
            connectionId={c.id}
            label={c.label}
            active={c.active}
            primary={c.is_primary}
            kind="channel_connection"
            typeId={c.type_id}
            manual
            trigger="button"
            triggerLabel="Editar o eliminar"
          />
        ) : undefined
      }
    >
      {res.ok ? (
        <CredencialesConexion
          campos={res.data.fields}
          revealUrl={`/api/connections/${encodeURIComponent(id)}/credentials/reveal`}
        />
      ) : (
        <p role="alert" className="text-status-danger-fg">
          No se pudieron cargar las credenciales: {res.error}
        </p>
      )}
    </SeccionFicha>
  );
}
