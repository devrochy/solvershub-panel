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
  const total = res.data.length;
  const activos = res.data.filter((c) => c.active).length;
  const pendientes = invRes.ok ? invRes.data.length : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Equipo"
        description="Tu equipo: cuentas con acceso al panel, sus permisos por sección y sus negocios vinculados."
        helpSection="collaborators"
        actions={<NewCollaboratorDialog packRoles={rolesRes.ok ? rolesRes.data : []} esMaster={esMaster} />}
      />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full border border-border-soft bg-surface-2 px-3 py-1 text-body">
          <strong className="tabular-nums text-headline">{total}</strong> {total === 1 ? "cuenta" : "cuentas"}
        </span>
        <span className="rounded-full border border-status-success-border bg-status-success-bg px-3 py-1 text-status-success-fg">
          <strong className="tabular-nums">{activos}</strong> {activos === 1 ? "activa" : "activas"}
        </span>
        {pendientes > 0 && (
          <span className="rounded-full border border-status-warning-border bg-status-warning-bg px-3 py-1 text-status-warning-fg">
            <strong className="tabular-nums">{pendientes}</strong> {pendientes === 1 ? "invitación pendiente" : "invitaciones pendientes"}
          </span>
        )}
      </div>
      <TablaDeColaboradores filas={res.data} secciones={secciones} esMaster={esMaster} />
      <InvitacionesPendientes invitaciones={invRes.ok ? invRes.data : []} />
    </div>
  );
}
