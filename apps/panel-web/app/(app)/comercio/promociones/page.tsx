import Link from "next/link";
import { Plus } from "lucide-react";

import {
  EditorDePromocion,
  InterruptorDePromocion,
  type Option,
  type Promotion,
} from "@/app/(app)/comercio/promociones/_components/editor-de-promocion";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import type { Aliado, ModulosComercio } from "@/lib/aliados";
import { apiFetch } from "@/lib/api/server";
import { estadoDePromo, promoEnPalabras, type NombresDeVentas } from "@/lib/ventas";

export const metadata = { title: "Promociones" };

const hrefPromocion = (id?: string) => (id ? `/comercio/promociones?promocion=${encodeURIComponent(id)}` : "/comercio/promociones");
const nombreDe = (p: Promotion) => String(p.rules.label ?? "").trim() || "Promoción sin nombre";

/**
 * Promociones (VEN-11/12): cada una como frase («19 % en Ropa · del 20 al 21 de nov.»), con un solo
 * estado y su interruptor; tocarla la abre en el editor. Primero las encendidas.
 */
export default async function PromotionsPage({ searchParams }: { searchParams: Promise<{ promocion?: string }> }) {
  const [sp, res, categoriasRes, productosRes, modulosRes] = await Promise.all([
    searchParams,
    apiFetch<Promotion[]>("/pack/commerce/promotions"),
    apiFetch<Option[]>("/pack/commerce/categories"),
    apiFetch<Option[]>("/pack/commerce/products"),
    apiFetch<ModulosComercio>("/pack/commerce/modulos"),
  ]);
  // HU-CRM-03: `null` = aliados apagados en el negocio.
  const aliadosRes = modulosRes.ok && modulosRes.data.aliados ? await apiFetch<Aliado[]>("/pack/commerce/allies") : null;
  const aliados: Option[] | null = aliadosRes ? (aliadosRes.ok ? aliadosRes.data : []) : null;

  const header = (
    <PageHeader
      title="Promociones"
      description="Descuentos que el asistente ofrece. Si varias aplican a un carrito, usa la de mayor beneficio."
      actions={
        <Button asChild variant="accent">
          <Link href={hrefPromocion("nueva")} scroll={false}>
            <Plus className="h-4 w-4" aria-hidden /> Nueva promoción
          </Link>
        </Button>
      }
    />
  );
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorDeCarga titulo="No pudimos cargar las promociones" detalle={res.error} />
      </div>
    );
  }
  const categorias = categoriasRes.ok ? categoriasRes.data : [];
  const productos = productosRes.ok ? productosRes.data : [];
  const nombres: NombresDeVentas = {
    categorias: new Map(categorias.map((c) => [c.id, c.name])),
    productos: new Map(productos.map((p) => [p.id, p.name])),
    aliados: new Map((aliados ?? []).map((a) => [a.id, a.name])),
  };
  const promos = [...res.data].sort((a, b) => Number(b.active) - Number(a.active) || nombreDe(a).localeCompare(nombreDe(b), "es"));
  const abierta = sp.promocion === "nueva" ? "nueva" : promos.find((p) => p.id === sp.promocion);

  const columns: Column<Promotion>[] = [
    {
      key: "promocion",
      header: "Promoción",
      cell: (p) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium text-headline">{nombreDe(p)}</span>
          <span className="text-sm text-body">{promoEnPalabras(p, nombres)}</span>
        </div>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (p) => {
        const e = estadoDePromo(p);
        return <Badge variant={e.tono}>{e.label}</Badge>;
      },
    },
    {
      key: "encendida",
      header: <span className="sr-only">Encendida</span>,
      align: "right",
      className: "relative z-10 w-16",
      cell: (p) => <InterruptorDePromocion key={`${p.id}-${p.active}`} id={p.id} nombre={nombreDe(p)} activa={p.active} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {header}
      <TablaResponsiva
        etiqueta="Promociones"
        caption="Promociones"
        columns={columns}
        rows={promos}
        getRowKey={(p) => p.id}
        getRowHref={(p) => hrefPromocion(p.id)}
        getRowLabel={(p) => `Editar ${nombreDe(p)}`}
        scrollAlAbrir={false}
        density="comfortable"
        emptyTitle="Aún no hay promociones"
        emptyDescription="Crea una para que el asistente ofrezca descuentos: por fechas, por cantidad o de bienvenida."
        filaCelular={(p) => ({
          titulo: nombreDe(p),
          detalle: `${estadoDePromo(p).label} · ${promoEnPalabras(p, nombres)}`,
          href: hrefPromocion(p.id),
          accion: <InterruptorDePromocion key={`${p.id}-${p.active}`} id={p.id} nombre={nombreDe(p)} activa={p.active} />,
        })}
      />
      {promos.length > 1 && (
        <p className="text-xs text-text-soft">Las promociones no se suman: el cliente recibe la de mayor beneficio para su carrito.</p>
      )}

      {abierta && (
        <EditorDePromocion
          key={abierta === "nueva" ? "nueva" : abierta.id}
          promocion={abierta === "nueva" ? undefined : abierta}
          categorias={categorias}
          productos={productos}
          aliados={aliados}
          nombres={nombres}
          alCerrar={hrefPromocion()}
        />
      )}
    </div>
  );
}
