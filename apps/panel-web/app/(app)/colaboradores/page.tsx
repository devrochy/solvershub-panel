import { CollaboratorActions } from "@/app/(app)/colaboradores/_components/collaborator-actions";
import { NewCollaboratorDialog } from "@/app/(app)/colaboradores/_components/new-collaborator-dialog";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { CollaboratorItem, Me } from "@/lib/api/types";

export const metadata = { title: "Colaboradores" };

export default async function CollaboratorsPage() {
  const [res, meRes, rolesRes] = await Promise.all([
    apiFetch<CollaboratorItem[]>("/admin/collaborators"),
    apiFetch<Me>("/admin/me"),
    apiFetch<{ value: string; label: string }[]>("/admin/collaborators/pack-roles"),
  ]);
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar los colaboradores: {res.error}
      </p>
    );
  }
  const sections = Object.keys(meRes.ok ? meRes.data.permissions : {}).sort();

  const columns: Column<CollaboratorItem>[] = [
    {
      key: "cuenta",
      header: "Cuenta",
      cell: (c) => (
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2 text-headline">
            {c.email}
            {c.is_self && <Badge variant="neutral">tú</Badge>}
          </span>
          {c.username && <span className="font-mono text-xs text-text-soft">{c.username}</span>}
        </div>
      ),
    },
    {
      key: "rol",
      header: "Rol",
      cell: (c) => (
        <Badge variant={c.is_platform_master ? "accent" : "neutral"}>
          {c.is_platform_master ? "master" : c.role}
        </Badge>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (c) => (
        <Badge variant={c.active ? "success" : "danger"}>{c.active ? "Activa" : "Inactiva"}</Badge>
      ),
    },
    {
      key: "negocios",
      header: "Negocios",
      cell: (c) =>
        c.links.length === 0 ? (
          <span className="text-text-soft">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {c.links.map((link) => (
              <Badge key={`${link.slug}-${link.role}`} variant="neutral">
                {link.name} · {link.role}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      key: "permisos",
      header: "Permisos",
      info: "Permisos por sección que tiene el colaborador en este negocio.",
      cell: (c) =>
        c.permissions.length === 0 ? (
          <span className="text-text-soft">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {c.permissions.map((permission) => (
              <Badge key={`${permission.section}-${permission.scope}`} variant="neutral">
                {permission.section}:{permission.access}
                {permission.scope !== "*" ? `@${permission.scope}` : ""}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (c) => <CollaboratorActions collaborator={c} sections={sections} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Colaboradores"
        description="Cuentas con acceso al panel, sus permisos por sección y sus negocios vinculados."
        actions={<NewCollaboratorDialog packRoles={rolesRes.ok ? rolesRes.data : []} />}
      />
      <DataTable
        columns={columns}
        rows={res.data}
        getRowKey={(c) => c.id}
        emptyTitle="Sin colaboradores"
        emptyDescription="Invita a tu equipo para que gestionen el panel contigo."
      />
    </div>
  );
}
