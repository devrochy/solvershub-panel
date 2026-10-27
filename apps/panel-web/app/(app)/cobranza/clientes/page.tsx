import Link from "next/link";
import { Plus, Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api/server";
import { formatCop } from "@/lib/format";
import {
  ClientFormDialog,
  ClientRowActions,
  RIESGO_LABEL,
  type CarteraOpcion,
  type Cliente,
} from "./_components/client-dialog";

export const metadata = { title: "Clientes" };

const RIESGO_TONE: Record<string, "neutral" | "accent" | "danger"> = {
  blanco: "neutral",
  azul: "accent",
  rojo: "danger",
};

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ cartera?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.cartera) qs.set("cartera_id", sp.cartera);
  if (sp.q) qs.set("q", sp.q);

  const [res, carterasRes] = await Promise.all([
    apiFetch<Cliente[]>(`/pack/cobranza/clients${qs.size ? `?${qs}` : ""}`),
    apiFetch<CarteraOpcion[]>("/pack/cobranza/portfolios"),
  ]);
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar los clientes: {res.error}
      </p>
    );
  }
  const carteras = carterasRes.ok ? carterasRes.data : [];
  const hayFiltros = Boolean(sp.cartera || sp.q);

  const columns: Column<Cliente>[] = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (c) => (
        <span className="text-headline">{`${c.nombre} ${c.apellido}`.trim()}</span>
      ),
    },
    { key: "cartera", header: "Cartera", cell: (c) => <span className="text-body">{c.cartera}</span> },
    { key: "telefono", header: "Teléfono", cell: (c) => <span className="text-body">{c.telefono || "—"}</span> },
    {
      key: "documento",
      header: "Documento",
      cell: (c) => (
        <span className="text-body">
          {c.numero_documento ? `${c.tipo_documento} ${c.numero_documento}`.trim() : "—"}
        </span>
      ),
    },
    { key: "negocio", header: "Negocio", cell: (c) => <span className="text-body">{c.negocio || "—"}</span> },
    {
      key: "tope",
      header: "Tope de deuda",
      align: "right",
      cell: (c) => (c.tope_maximo_deuda > 0 ? formatCop(c.tope_maximo_deuda) : "—"),
    },
    {
      key: "riesgo",
      header: "Riesgo",
      cell: (c) => (
        <Badge variant={RIESGO_TONE[c.color_riesgo] ?? "neutral"}>
          {RIESGO_LABEL[c.color_riesgo] ?? c.color_riesgo}
        </Badge>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <IconAction href={`/cobranza/carteras/${c.cartera_id}/clientes/${c.id}`} label="Ver ficha" tone="ver">
            <Eye className="h-4 w-4" aria-hidden />
          </IconAction>
          <ClientRowActions cliente={c} carteras={carteras} />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clientes"
        description="Clientes de las carteras (una cartera por cliente)."
        actions={
          carteras.length > 0 ? (
            <ClientFormDialog
              carteras={carteras}
              trigger={
              <Button variant="accent">
                <Plus className="h-4 w-4" aria-hidden /> Nuevo cliente
              </Button>
            }
            />
          ) : (
            <Button asChild variant="outline">
              <Link href="/cobranza/carteras">Crea una cartera primero</Link>
            </Button>
          )
        }
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <Field label="Cartera" htmlFor="cartera" className="w-56">
          <Select id="cartera" name="cartera" defaultValue={sp.cartera ?? ""}>
            <option value="">Todas</option>
            {carteras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Buscar" htmlFor="q" className="w-64">
          <Input id="q" name="q" defaultValue={sp.q ?? ""} placeholder="Nombre o documento" />
        </Field>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {hayFiltros && (
          <Link href="/cobranza/clientes" className="pb-2.5 text-sm text-link hover:underline">
            Limpiar
          </Link>
        )}
      </form>

      <DataTable
        columns={columns}
        rows={res.data}
        getRowKey={(c) => c.id}
        emptyTitle="Sin clientes"
        emptyDescription="Crea el primero con «Nuevo cliente» o revisa los filtros."
      />
    </div>
  );
}
