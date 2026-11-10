import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import {
  ExportCsvButton,
  type BusinessNumberRow,
} from "@/app/(app)/conexiones/_components/meta/numeros/export-csv-button";
import { Badge } from "@/components/ui/badge";
import { type Column } from "@/components/ui/data-table";
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

/**
 * Todos los números del portafolio de Meta (CON-13): Meta limita cuántos tiene un portafolio, y
 * esta lista ayuda a decidir cuál liberar. Los identificadores de Meta van en el CSV, no en la tabla.
 */
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

  if (!res.ok) {
    return (
      <SeccionFicha titulo="Todos los números en Meta">
        <ErrorDeCarga titulo="No se pudieron leer los números del portafolio" detalle={res.error} />
      </SeccionFicha>
    );
  }
  const { business_name, numbers, other_tenants_count, warnings } = res.data;
  const cuentas = new Set(numbers.map((n) => n.waba_id)).size;
  const tono = (n: BusinessNumberRow) => (n.status === "CONNECTED" ? "success" : n.status === "PENDING" ? "warning" : "neutral");

  const columns: Column<BusinessNumberRow>[] = [
    {
      key: "numero",
      header: "Número",
      cell: (n) => (
        <div className="flex flex-col">
          <span className="font-medium tabular-nums text-headline">{n.display_phone_number ?? "Sin mostrar"}</span>
          <span className="text-xs text-text-soft">{n.verified_name ?? "Sin nombre"}</span>
        </div>
      ),
    },
    {
      key: "cuenta",
      header: "Cuenta de WhatsApp",
      cell: (n) => (
        <span className="flex flex-wrap items-center gap-2 text-body">
          {n.waba_name ?? "Sin nombre"}
          {n.in_this_connection && <Badge variant="accent">En esta conexión</Badge>}
        </span>
      ),
    },
    { key: "estado", header: "Estado", cell: (n) => <Badge variant={tono(n)}>{estadoNumeroMetaLabel(n.status)}</Badge> },
    {
      key: "verificacion",
      header: "Verificación",
      className: "max-lg:hidden",
      cell: (n) => <span className="text-body">{verificacionNumeroLabel(n.code_verification_status)}</span>,
    },
    {
      key: "calidad",
      header: "Calidad",
      info: "Cómo califica Meta el número según cómo responden tus clientes.",
      className: "max-lg:hidden",
      cell: (n) => <span className="text-body">{calidadNumeroLabel(n.quality_rating)}</span>,
    },
  ];

  const resumen = [
    `${numbers.length} ${numbers.length === 1 ? "número" : "números"} en ${cuentas} ${cuentas === 1 ? "cuenta" : "cuentas"} de WhatsApp`,
    business_name ? `portafolio ${business_name}` : null,
    other_tenants_count > 0 ? `${other_tenants_count} más de otros negocios, que no se muestran` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <SeccionFicha
      titulo="Todos los números en Meta"
      descripcion={`Meta limita los números por portafolio, sumando todas sus cuentas. Si llegaste al límite, libera uno en WhatsApp Manager. ${resumen}.`}
      acciones={<ExportCsvButton rows={numbers} />}
    >
      {warnings.length > 0 && (
        <div role="status" className="flex flex-col gap-1 rounded-md border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-headline">
          {warnings.map((aviso) => (
            <p key={aviso}>{aviso}</p>
          ))}
        </div>
      )}

      <TablaResponsiva
        etiqueta="Números del portafolio"
        columns={columns}
        rows={numbers}
        getRowKey={(n) => n.phone_number_id}
        emptyTitle="Meta no devolvió números"
        emptyDescription="El portafolio no tiene números o el permiso de acceso no alcanza para leerlos."
        filaCelular={(n) => ({
          titulo: n.display_phone_number ?? "Sin mostrar",
          detalle: `${estadoNumeroMetaLabel(n.status)} · ${n.waba_name ?? "Sin nombre"}${n.in_this_connection ? " · En esta conexión" : ""}`,
        })}
      />
    </SeccionFicha>
  );
}
