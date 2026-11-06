import Link from "next/link";

import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { MetaCosts } from "@/components/domain/meta-costs";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { apiFetch } from "@/lib/api/server";
import type { CostsResponse } from "@/lib/api/types";
import { costosDeLaCuenta, numerosDeLaCuenta } from "@/lib/conexion-ficha";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";
import { formatNumber, formatUsd } from "@/lib/format";

export const metadata = { title: "Costos" };

type CuentaDeCreditos = { id: string; label: string | null; channel: string; business_id: string | null };

/**
 * Costos de WhatsApp de la cuenta de Meta del número (30 días): consumo por número de la cuenta,
 * sincronizar precios y créditos. El resto de los costos del negocio sigue en Consumo → Costos.
 */
export default async function CostosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await fichaDePestana(id, "costos");
  const metaId = ficha?.conexion.meta_connection_id;
  if (!ficha || !metaId) return null;
  const [res, creditosRes] = await Promise.all([
    apiFetch<CostsResponse>("/admin/costs"),
    apiFetch<{ connections: CuentaDeCreditos[] }>("/admin/costs/meta/credits"),
  ]);
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        {res.status === 403 ? "Tu rol no puede ver los costos del negocio." : `No se pudieron cargar los costos: ${res.error}`}
      </p>
    );
  }
  const numeros = numerosDeLaCuenta(ficha.consola.items, metaId).map((c) => c.external_id);
  const todos = res.data.meta?.by_phone ?? [];
  const propios = costosDeLaCuenta(todos, numeros);
  // Si ningún número de la consola coincide (la conexión guarda el id del número, no el número
  // visible), se muestra el consumo de todo el negocio y se dice.
  const separado = propios.length > 0 || todos.length === 0;
  const porNumero = separado ? propios : todos;
  const cuentas = creditosRes.ok ? creditosRes.data.connections.filter((c) => c.id === metaId) : [];

  return (
    <SeccionFicha
      titulo="Costos"
      descripcion="Lo que Meta cobra por los mensajes de esta cuenta en los últimos 30 días."
      acciones={
        <Button asChild variant="ghost" size="sm">
          <Link href="/costos">Costos del negocio →</Link>
        </Button>
      }
    >
      {!separado && (
        <p className="text-xs text-text-soft">No pudimos separar los números de esta cuenta: se muestran los de todo el negocio.</p>
      )}
      <DataTable
        caption={separado ? "Costo de WhatsApp por número de la cuenta (30 días)" : "Costo de WhatsApp por número del negocio (30 días)"}
        columns={[
          { key: "numero", header: "Número", cell: (r) => <span className="font-mono text-xs">{r.phone_number}</span> },
          { key: "volumen", header: "Mensajes", align: "right", cell: (r) => <span className="text-body">{formatNumber(r.volume)}</span> },
          { key: "costo", header: "Costo", align: "right", cell: (r) => formatUsd(r.cost) },
        ]}
        rows={porNumero}
        getRowKey={(r, i) => `${r.phone_number}-${i}`}
        emptyTitle="Sin consumo de Meta"
        emptyDescription="Sincroniza los costos para traer lo que Meta registró."
      />
      <MetaCosts connections={cuentas} />
    </SeccionFicha>
  );
}
