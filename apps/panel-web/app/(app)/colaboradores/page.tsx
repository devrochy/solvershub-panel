import { InvitacionesPendientes, type InvitacionPendiente } from "@/app/(app)/colaboradores/_components/invitaciones-pendientes";
import { NewCollaboratorDialog } from "@/app/(app)/colaboradores/_components/new-collaborator-dialog";
import { TablaDeColaboradores, type FichaAbierta } from "@/app/(app)/colaboradores/_components/tabla-de-colaboradores";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { CollaboratorItem, Me } from "@/lib/api/types";
import { esMasterDePlataforma, seccionesOtorgables } from "@/lib/colaboradores";

export const metadata = { title: "Equipo" };

/** «5 personas en tu equipo y 1 invitación pendiente.» (EQU-10) */
function resumenDelEquipo(personas: number, pendientes: number): string {
  const base = `${personas} ${personas === 1 ? "persona" : "personas"} en tu equipo`;
  if (pendientes === 0) return `${base}.`;
  return `${base} y ${pendientes} ${pendientes === 1 ? "invitación pendiente" : "invitaciones pendientes"}.`;
}

function fichaDeLaUrl(params: Record<string, string | string[] | undefined>): FichaAbierta | null {
  const id = typeof params.persona === "string" ? params.persona : "";
  if (!id) return null;
  return { id, pestana: params.pestana === "permisos" ? "permisos" : "acceso", contrasena: params.abrir === "contrasena" };
}

export default async function CollaboratorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [res, meRes, rolesRes, invRes, params] = await Promise.all([
    apiFetch<CollaboratorItem[]>("/admin/collaborators"),
    apiFetch<Me>("/admin/me"),
    apiFetch<{ value: string; label: string }[]>("/admin/collaborators/pack-roles"),
    apiFetch<InvitacionPendiente[]>("/admin/invitations/outgoing"),
    searchParams,
  ]);
  // Solo el master gestiona la plataforma: campo de negocio, vincular y crear masters. Un
  // dueño (y un tester, que aquí actúa como dueño) gestiona su negocio activo.
  const esMaster = meRes.ok && esMasterDePlataforma(meRes.data);
  const invitar = <NewCollaboratorDialog packRoles={rolesRes.ok ? rolesRes.data : []} esMaster={esMaster} />;

  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Equipo" helpSection="collaborators" actions={invitar} />
        <ErrorDeCarga titulo="No pudimos cargar tu equipo" detalle={res.error} />
      </div>
    );
  }

  const secciones = seccionesOtorgables(meRes.ok ? meRes.data.permissions : null, esMaster);
  const invitaciones = invRes.ok ? invRes.data : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Equipo"
        description={resumenDelEquipo(res.data.length, invitaciones.length)}
        helpSection="collaborators"
        actions={invitar}
      />
      <InvitacionesPendientes invitaciones={invitaciones} />
      <TablaDeColaboradores filas={res.data} secciones={secciones} esMaster={esMaster} abierta={fichaDeLaUrl(params)} />
    </div>
  );
}
