import Link from "next/link";

import { NewTenantDialog } from "@/app/(app)/tenants/_components/new-tenant-dialog";
import { TenantActions } from "@/app/(app)/tenants/_components/tenant-actions";
import { TENANT_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type { PlanResponse, PlatformTenantPage } from "@/lib/api/types";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Tenants" };

type TenantRow = PlatformTenantPage["items"][number];

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.q) qs.set("q", sp.q);
  if (sp.page) qs.set("page", sp.page);

  const [res, plansRes] = await Promise.all([
    apiFetch<PlatformTenantPage>(
      `/admin/platform/tenants${qs.size ? `?${qs.toString()}` : ""}`,
    ),
    apiFetch<PlanResponse>("/admin/plan"),
  ]);
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        {res.status === 403
          ? "Solo el admin de plataforma puede ver esto."
          : `Error: ${res.error}`}
      </p>
    );
  }
  const plans = plansRes.ok ? plansRes.data.plans : [];
  const { items, page, has_more, total } = res.data;

  const columns: Column<TenantRow>[] = [
    { key: "negocio", header: "Negocio", cell: (t) => t.name || "—" },
    { key: "slug", header: "Slug", cell: (t) => <span className="font-mono text-xs text-body">{t.slug}</span> },
    {
      key: "estado",
      header: "Estado",
      cell: (t) => <StatusBadge value={t.status} map={TENANT_STATUS} />,
    },
    {
      key: "plan",
      header: "Plan",
      cell: (t) => (
        <span className="flex items-center gap-2">
          <span className="text-headline">{t.plan_name}</span>
          <Badge variant={t.operational ? "neutral" : "danger"}>{t.plan_status}</Badge>
        </span>
      ),
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
      cell: (t) => <TenantActions tenant={t} plans={plans} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tenants"
        description="Gestión de plataforma: todos los negocios y su plan."
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
