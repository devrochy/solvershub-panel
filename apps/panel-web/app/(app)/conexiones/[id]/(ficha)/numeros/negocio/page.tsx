import Link from "next/link";

import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";

import {
  ExportCsvButton,
  type BusinessNumberRow,
} from "@/app/(app)/conexiones/_components/meta/numeros/export-csv-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { apiFetch } from "@/lib/api/server";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";
import { calidadNumeroLabel, estadoNumeroMetaLabel, verificacionNumeroLabel } from "@/lib/labels";

export const metadata = { title: "Números del negocio en Meta" };

type BusinessNumbersResponse = {
  business_id: string | null;
  business_name: string | null;
  numbers: BusinessNumberRow[];
  /** Números del portafolio que ya tiene otro negocio de la plataforma (no se muestran). */
  other_tenants_count: number;
  warnings: string[];
};

export default async function BusinessNumbersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ficha = await fichaDePestana(id, "numeros");
  const connectionId = ficha?.conexion.meta_connection_id;
  if (!connectionId) return null;
  const res = await apiFetch<BusinessNumbersResponse>(
    `/admin/meta/connections/${connectionId}/business-numbers`,
  );

  const volver = (
    <Button asChild variant="ghost" size="sm">
      <Link href={`/conexiones/${id}/numeros`}>← Volver a Números</Link>
    </Button>
  );

  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        {volver}
        <p role="alert" className="text-status-danger-fg">
          No se pudieron leer los números del negocio en Meta: {res.error}
        </p>
      </div>
    );
  }
  const { business_name, numbers, other_tenants_count, warnings } = res.data;
  const cuentas = new Set(numbers.map((n) => n.waba_id)).size;

  const columns: Column<BusinessNumberRow>[] = [
    {
      key: "cuenta",
      header: "Cuenta de WhatsApp",
      cell: (n) => (
        <div className="flex flex-col">
          <span className="text-headline">
            {n.waba_name ?? "Sin nombre"}
            {n.is_connection_waba && (
              <Badge variant="accent" className="ml-2">
                Esta conexión
              </Badge>
            )}
          </span>
          <span className="font-mono text-xs text-text-soft">{n.waba_id}</span>
        </div>
      ),
    },
    {
      key: "numero",
      header: "Número",
      cell: (n) => (
        <div className="flex flex-col">
          <span className="text-headline">{n.display_phone_number ?? "—"}</span>
          <span className="font-mono text-xs text-text-soft">{n.phone_number_id}</span>
        </div>
      ),
    },
    {
      key: "nombre",
      header: "Nombre verificado",
      cell: (n) => <span className="text-body">{n.verified_name ?? "—"}</span>,
    },
    {
      key: "estado",
      header: "Estado",
      cell: (n) => (
        <Badge variant={n.status === "CONNECTED" ? "success" : n.status === "PENDING" ? "warning" : "neutral"}>
          {estadoNumeroMetaLabel(n.status)}
        </Badge>
      ),
    },
    {
      key: "verificacion",
      header: "Verificación",
      cell: (n) => <span className="text-body">{verificacionNumeroLabel(n.code_verification_status)}</span>,
    },
    {
      key: "calidad",
      header: "Calidad",
      cell: (n) => <span className="text-body">{calidadNumeroLabel(n.quality_rating)}</span>,
    },
    {
      key: "conexion",
      header: "En esta conexión",
      cell: (n) => (
        <Badge variant={n.in_this_connection ? "success" : "neutral"}>{n.in_this_connection ? "Sí" : "No"}</Badge>
      ),
    },
  ];

  return (
    <SeccionFicha
      titulo="Números del negocio en Meta"
      descripcion="Meta limita los números por portafolio, contando todas sus cuentas de WhatsApp. Revisa cuáles hay para decidir cuál liberar en WhatsApp Manager."
      acciones={
        <>
          {volver}
          <ExportCsvButton rows={numbers} />
        </>
      }
    >

      <p className="text-sm text-body">
        {numbers.length} {numbers.length === 1 ? "número" : "números"} en {cuentas}{" "}
        {cuentas === 1 ? "cuenta" : "cuentas"} de WhatsApp
        {business_name ? ` · portafolio ${business_name}` : ""}
        {other_tenants_count > 0 ? ` · ${other_tenants_count} más de otros negocios (no se muestran)` : ""}
      </p>

      {warnings.map((aviso) => (
        <p key={aviso} role="status" className="text-sm text-status-warning-fg">
          {aviso}
        </p>
      ))}

      <DataTable
        columns={columns}
        rows={numbers}
        getRowKey={(n) => n.phone_number_id}
        emptyTitle="Meta no devolvió números"
        emptyDescription="El portafolio no tiene números o el token no puede leerlos."
      />
    </SeccionFicha>
  );
}
