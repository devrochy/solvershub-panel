import { notFound } from "next/navigation";

import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { ListPage } from "@/components/templates/list-page";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { apiFetch } from "@/lib/api/server";
import type { FeedbackCatalogo, FeedbackPagina, Me } from "@/lib/api/types";
import { areasDelCatalogo, queryDeReportes } from "@/lib/feedback";

import { BotonReportar } from "./_components/boton-reportar";
import { ListaDeReportes } from "./_components/lista-de-reportes";
import { opcionesDeAlcance, opcionesDeEstado } from "./_components/filtros";

export const metadata = { title: "Mis reportes" };

/**
 * Mis reportes (SPEC-54, HU-FB-05): lo que la persona envió con «Reportar un problema», con su estado y los
 * créditos de regalo. El propietario puede ver los de todo el negocio. Con los reportes apagados, 404.
 */
export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ alcance?: string; estado?: string }>;
}) {
  const sp = await searchParams;
  const [meRes, catalogoRes] = await Promise.all([apiFetch<Me>("/admin/me"), apiFetch<FeedbackCatalogo>("/feedback/catalogo")]);
  if (!catalogoRes.ok && catalogoRes.status === 404) notFound();
  const esOwner = meRes.ok && meRes.data.tenant?.role === "owner";
  const alcance = esOwner && sp.alcance === "negocio" ? "negocio" : "mios";
  const estado = sp.estado ?? null;
  const query = queryDeReportes({ alcance, estado });
  const res = await apiFetch<FeedbackPagina>(`/feedback/reports${query}`);
  const areas = Object.fromEntries(areasDelCatalogo({ areas: catalogoRes.ok ? catalogoRes.data.areas : [] }).map((a) => [a.clave, a.etiqueta]));

  return (
    <ListPage
      header={{
        title: alcance === "negocio" ? "Reportes del negocio" : "Mis reportes",
        description:
          alcance === "negocio"
            ? "Errores, mejoras e ideas que envió tu equipo. Revisamos cada uno y, si lo aprobamos, tu negocio recibe créditos de regalo."
            : "Errores, mejoras e ideas que enviaste. Revisamos cada uno y, si lo aprobamos, tu negocio recibe créditos de regalo.",
        breadcrumbs: [{ label: "Cuenta" }, { label: "Mis reportes" }],
        actions: catalogoRes.ok ? <BotonReportar /> : undefined,
      }}
      filters={
        <>
          {esOwner && (
            <SegmentedControl label="De quién" options={opcionesDeAlcance(estado)} value={alcance} />
          )}
          <SegmentedControl label="Estado" options={opcionesDeEstado(alcance)} value={estado ?? "todos"} />
        </>
      }
    >
      {res.ok ? (
        <ListaDeReportes
          key={query}
          inicial={res.data}
          query={query}
          areas={areas}
          zona={meRes.ok ? (meRes.data.timezone ?? "America/Bogota") : "America/Bogota"}
          propios={alcance === "mios"}
          adminId={meRes.ok ? meRes.data.admin_id : null}
        />
      ) : (
        <ErrorDeCarga titulo="No pudimos cargar tus reportes" detalle={res.error} />
      )}
    </ListPage>
  );
}
