import { InvitacionesPendientes, type InvitacionPendiente } from "@/app/(app)/colaboradores/_components/invitaciones-pendientes";
import { NewCollaboratorDialog } from "@/app/(app)/colaboradores/_components/new-collaborator-dialog";
import { TablaDeColaboradores } from "@/app/(app)/colaboradores/_components/tabla-de-colaboradores";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { CollaboratorItem, Me } from "@/lib/api/types";
import { esMasterDePlataforma, seccionesOtorgables } from "@/lib/colaboradores";

export const metadata = { title: "Equipo" };

export default async function CollaboratorsPage() {
  const [res, meRes, rolesRes, invRes] = await Promise.all([
    apiFetch<CollaboratorItem[]>("/admin/collaborators"),
    apiFetch<Me>("/admin/me"),
    apiFetch<{ value: string; label: string }[]>("/admin/collaborators/pack-roles"),
    apiFetch<InvitacionPendiente[]>("/admin/invitations/outgoing"),
  ]);
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar los colaboradores: {res.error}
      </p>
    );
  }
  // Solo el master gestiona la plataforma: campo de negocio, vincular y crear masters. Un
  // dueño (y un tester, que aquí actúa como dueño) gestiona su negocio activo.
  const esMaster = meRes.ok && esMasterDePlataforma(meRes.data);
  const secciones = seccionesOtorgables(meRes.ok ? meRes.data.permissions : null, esMaster);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Equipo"
        description="Tu equipo: cuentas con acceso al panel, sus permisos por sección y sus negocios vinculados."
        helpSection="collaborators"
        actions={<NewCollaboratorDialog packRoles={rolesRes.ok ? rolesRes.data : []} esMaster={esMaster} />}
      />
      <TablaDeColaboradores filas={res.data} secciones={secciones} esMaster={esMaster} />
      <InvitacionesPendientes invitaciones={invRes.ok ? invRes.data : []} />
    </div>
  );
}
