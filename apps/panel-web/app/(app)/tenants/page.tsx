import { NewTenantDialog } from "@/app/(app)/tenants/_components/new-tenant-dialog";
import { AccionesDeNegocio, FichaDeNegocio } from "@/app/(app)/tenants/_components/tenant-actions";
import { BuscarEnUrl } from "@/components/domain/buscar-en-url";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { StatusBadge, TENANT_STATUS } from "@/components/domain/status-badge";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import type { Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type { Me, PlanResponse, PlatformTenantPage } from "@/lib/api/types";
import { estadoDelPlan } from "@/lib/estados-negocio";
import { formatDate } from "@/lib/format";
import { UUID, esMasterDePlataforma } from "@/lib/opciones-directas-bandera";

export const metadata = { title: "Negocios" };

type TenantRow = PlatformTenantPage["items"][number];

/**
 * Plataforma › Negocios (PLT-01, PLT-02): la búsqueda filtra al escribir, la fila abre el negocio
 * en un cajón (`?negocio=`) y las acciones van en «Más acciones». `?abrir=` (el enlace del editor de
 * plantillas con opciones) abre el mismo cajón, solo para el master.
 */
export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; abrir?: string; negocio?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.q) qs.set("q", sp.q);
  if (sp.page) qs.set("page", sp.page);

  const [res, plansRes, me] = await Promise.all([
    apiFetch<PlatformTenantPage>(`/admin/platform/tenants${qs.size ? `?${qs.toString()}` : ""}`),
    apiFetch<PlanResponse>("/admin/plan"),
    apiFetch<Me>("/admin/me"),
  ]);
  const header = (
    <PageHeader title="Negocios" helpSection="tenants" actions={<NewTenantDialog />} />
  );
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorDeCarga titulo="No pudimos cargar los negocios" detalle={res.error} />
      </div>
    );
  }
  const plans = plansRes.ok ? plansRes.data.plans : [];
  const esMaster = me.ok && esMasterDePlataforma(me.data);
  const { items, page, has_more, total } = res.data;

  const hrefDe = (cambios: Record<string, string | null>) => {
    const next = new URLSearchParams(qs);
    for (const [k, v] of Object.entries(cambios)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    return `/tenants${next.size ? `?${next.toString()}` : ""}`;
  };
  const abrirHref = (t: TenantRow) => hrefDe({ negocio: t.id });
  const pedido = sp.negocio && UUID.test(sp.negocio) ? sp.negocio : esMaster && sp.abrir && UUID.test(sp.abrir) ? sp.abrir : null;
  const abierto = pedido ? items.find((t) => t.id === pedido) : undefined;

  const columns: Column<TenantRow>[] = [
    {
      key: "negocio",
      header: "Negocio",
      cell: (t) => (
        <span className="flex flex-col">
          <span className="font-medium text-headline">{t.name || t.slug}</span>
          <span className="text-xs text-text-soft">{t.slug}</span>
        </span>
      ),
    },
    { key: "estado", header: "Estado", cell: (t) => <StatusBadge value={t.status} map={TENANT_STATUS} /> },
    { key: "plan", header: "Plan", cell: (t) => <span className="text-body">{estadoDelPlan(t).label}</span> },
    { key: "creado", header: "Creado", cell: (t) => <span className="text-body">{formatDate(t.created_at)}</span> },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      className: "w-14",
      cell: (t) => <AccionesDeNegocio tenant={t} abrirHref={abrirHref(t)} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {header}
      <BuscarEnUrl label="Buscar un negocio" placeholder="Buscar por nombre o slug" className="max-w-md" />

      <TablaResponsiva
        etiqueta="Negocios"
        caption="Negocios"
        columns={columns}
        rows={items}
        getRowKey={(t) => t.id}
        getRowHref={abrirHref}
        getRowLabel={(t) => `Abrir ${t.name || t.slug}`}
        scrollAlAbrir={false}
        emptyTitle="Ningún negocio coincide"
        emptyDescription="Prueba con otra parte del nombre o del slug."
        serverPaginated
        filaCelular={(t) => ({
          titulo: t.name || t.slug,
          detalle: `${t.slug} · ${estadoDelPlan(t).label}`,
          fin: <StatusBadge value={t.status} map={TENANT_STATUS} />,
          href: abrirHref(t),
        })}
      />

      <Pagination
        page={page}
        hasMore={has_more}
        total={total}
        label="negocios" singular="negocio"
        makeHref={(target) => hrefDe({ page: String(target), negocio: null })}
      />

      {abierto && (
        <FichaDeNegocio
          key={abierto.id}
          tenant={abierto}
          plans={plans}
          esMaster={esMaster}
          enfocarOpciones={!sp.negocio && Boolean(sp.abrir)}
          cerrarHref={hrefDe({ negocio: null, abrir: null })}
        />
      )}
    </div>
  );
}
