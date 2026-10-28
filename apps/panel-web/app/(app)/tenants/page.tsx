import Link from "next/link";

import { NewTenantDialog } from "@/app/(app)/tenants/_components/new-tenant-dialog";
import { TenantActions } from "@/app/(app)/tenants/_components/tenant-actions";
import { TenantPlanBadge } from "@/app/(app)/tenants/_components/tenant-plan-badge";
import { TenantStatusToggle } from "@/app/(app)/tenants/_components/tenant-status-toggle";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type { Me, PlanResponse, PlatformTenantPage } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { UUID, esMasterDePlataforma } from "@/lib/opciones-directas-bandera";

export const metadata = { title: "Negocios" };

type TenantRow = PlatformTenantPage["items"][number];

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; abrir?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.q) qs.set("q", sp.q);
  if (sp.page) qs.set("page", sp.page);

  const [res, plansRes, me] = await Promise.all([
    apiFetch<PlatformTenantPage>(
      `/admin/platform/tenants${qs.size ? `?${qs.toString()}` : ""}`,
    ),
    apiFetch<PlanResponse>("/admin/plan"),
    apiFetch<Me>("/admin/me"),
  ]);
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        {res.status === 403
          ? "Solo el admin de plataforma puede ver esto."
          : `Error: ${res.error}`}
      </p>
    );
  }
  const plans = plansRes.ok ? plansRes.data.plans : [];
  const esMaster = me.ok && esMasterDePlataforma(me.data);
  // Enlace del editor de plantillas con opciones: abre las acciones de ese negocio (solo master).
  const abrir = sp.abrir && UUID.test(sp.abrir) ? sp.abrir : null;
  const { items, page, has_more, total } = res.data;

  const columns: Column<TenantRow>[] = [
    { key: "negocio", header: "Negocio", cell: (t) => t.name || "—" },
    { key: "slug", header: "Slug", cell: (t) => <span className="font-mono text-xs text-body">{t.slug}</span> },
    {
      key: "estado",
      header: "Estado",
      cell: (t) => <TenantStatusToggle tenant={t} />,
    },
    {
      key: "plan",
      header: "Plan",
      cell: (t) => <TenantPlanBadge tenant={t} plans={plans} />,
    },
    {
      key: "creado",
      header: "Creado",
      cell: (t) => <span className="text-body">{formatDate(t.created_at)}</span>,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (t) => <TenantActions tenant={t} esMaster={esMaster} abrirInicial={t.id === abrir} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Negocios"
        description="Todos los negocios de la plataforma, con su estado y plan."
        actions={<NewTenantDialog />}
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <Field label="Buscar" htmlFor="q" className="w-64">
          <Input id="q" name="q" defaultValue={sp.q ?? ""} placeholder="Nombre o slug" />
        </Field>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {sp.q && (
          <Link href="/tenants" className="pb-2.5 text-sm text-link hover:underline">
            Limpiar
          </Link>
        )}
      </form>

      <DataTable
        columns={columns}
        rows={items}
        getRowKey={(t) => t.id}
        emptyTitle="Sin resultados"
        emptyDescription="Ajusta la búsqueda para encontrar un negocio."
        serverPaginated
      />

      <Pagination
        page={page}
        hasMore={has_more}
        total={total}
        label="negocios"
        makeHref={(target) => {
          const next = new URLSearchParams(qs);
          next.set("page", String(target));
          return `/tenants?${next.toString()}`;
        }}
      />
    </div>
  );
}
