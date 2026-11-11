import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";

import { AccionesDeAliado, EditorDeAliado } from "@/app/(app)/comercio/aliados/_components/ally-dialog";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { type Aliado, type ModulosComercio } from "@/lib/aliados";
import { apiFetch } from "@/lib/api/server";
import { cuantosProductos, hrefAliado } from "@/lib/ventas";

export const metadata = { title: "Aliados" };

const estadoDe = (a: Aliado) =>
  a.active ? { label: "Activo", tono: "success" as const } : { label: "Pausado", tono: "neutral" as const };

/**
 * Aliados (VEN-14): una fila por proveedor con su contacto, cuántos productos vende y su estado en
 * palabras; tocarla lo edita y «Más acciones» guarda eliminar.
 */
export default async function AlliesPage({ searchParams }: { searchParams: Promise<{ aliado?: string }> }) {
  // Con los aliados apagados para el negocio, la sección no existe (HU-CRM-03).
  const modulos = await apiFetch<ModulosComercio>("/pack/commerce/modulos");
  if (!modulos.ok || !modulos.data.aliados) notFound();

  const [sp, res] = await Promise.all([searchParams, apiFetch<Aliado[]>("/pack/commerce/allies")]);
  const header = (
    <PageHeader
      title="Aliados"
      description="Proveedores cuyos productos vendes. Asígnalos en cada producto o en el archivo, y úsalos para limitar promociones."
      actions={
        <Button asChild variant="accent">
          <Link href={hrefAliado("nuevo")} scroll={false}>
            <Plus className="h-4 w-4" aria-hidden /> Nuevo aliado
          </Link>
        </Button>
      }
    />
  );
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorDeCarga titulo="No pudimos cargar los aliados" detalle={res.error} />
      </div>
    );
  }
  const abierto = sp.aliado === "nuevo" ? "nuevo" : res.data.find((a) => a.id === sp.aliado);

  const columns: Column<Aliado>[] = [
    {
      key: "aliado",
      header: "Aliado",
      cell: (a) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-headline">{a.name}</span>
          {a.contact_info.contacto && <span className="truncate text-xs text-text-soft">{a.contact_info.contacto}</span>}
        </div>
      ),
    },
    {
      key: "contacto",
      header: "Contacto",
      cell: (a) => {
        const c = a.contact_info;
        if (!c.telefono && !c.email) return <span className="text-text-soft">Sin teléfono ni correo</span>;
        return (
          <div className="flex flex-col text-sm text-body">
            {c.telefono && <span>{c.telefono}</span>}
            {c.email && <span className="truncate">{c.email}</span>}
          </div>
        );
      },
    },
    {
      key: "productos",
      header: "Productos",
      className: "relative z-10",
      cell: (a) =>
        a.products > 0 ? (
          <Link href={`/comercio/productos?aliado=${a.id}`} className="text-link hover:underline">
            {cuantosProductos(a.products)}
          </Link>
        ) : (
          <span className="text-text-soft">Sin productos</span>
        ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (a) => {
        const e = estadoDe(a);
        return <Badge variant={e.tono}>{e.label}</Badge>;
      },
    },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      className: "relative z-10 w-12",
      cell: (a) => <AccionesDeAliado aliado={a} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {header}
      <TablaResponsiva
        etiqueta="Aliados"
        caption="Aliados"
        columns={columns}
        rows={res.data}
        getRowKey={(a) => a.id}
        getRowHref={(a) => hrefAliado(a.id)}
        getRowLabel={(a) => `Editar ${a.name}`}
        scrollAlAbrir={false}
        emptyTitle="Aún no hay aliados"
        emptyDescription="Crea el primero y asígnale sus productos."
        filaCelular={(a) => ({
          titulo: a.name,
          detalle: [estadoDe(a).label, cuantosProductos(a.products), a.contact_info.telefono].filter(Boolean).join(" · "),
          href: hrefAliado(a.id),
          accion: <AccionesDeAliado aliado={a} />,
        })}
      />
      {abierto && <EditorDeAliado key={abierto === "nuevo" ? "nuevo" : abierto.id} aliado={abierto === "nuevo" ? undefined : abierto} alCerrar="/comercio/aliados" />}
    </div>
  );
}
