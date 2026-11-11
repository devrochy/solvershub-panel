import Link from "next/link";

import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { MetaCosts } from "@/components/domain/meta-costs";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/server";
import type { CostsResponse, Me } from "@/lib/api/types";
import { costosDeLaCuenta, numerosDeLaCuenta } from "@/lib/conexion-ficha";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";
import { formatNumber, formatUsd } from "@/lib/format";

export const metadata = { title: "Costos" };

type CuentaDeCreditos = { id: string; label: string | null; channel: string; business_id: string | null };

/**
 * Costos de WhatsApp de la cuenta de Meta del número (30 días, CON-17): el total arriba, el
 * consumo por número y los créditos. Los costos de todo el negocio están en Plataforma › Costos técnicos (solo master).
 */
export default async function CostosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await fichaDePestana(id, "costos");
  const metaId = ficha?.conexion.meta_connection_id;
  if (!ficha || !metaId) return null;
  const [res, creditosRes, me] = await Promise.all([
    apiFetch<CostsResponse>("/admin/costs"),
    apiFetch<{ connections: CuentaDeCreditos[] }>("/admin/costs/meta/credits"),
    apiFetch<Me>("/admin/me"),
  ]);
  const esMaster = me.ok && me.data.role === "master";
  if (!res.ok) {
    return (
      <SeccionFicha titulo="Costos">
        {res.status === 403 ? (
          <ErrorDeCarga titulo="Tu rol no puede ver los costos del negocio" />
        ) : (
          <ErrorDeCarga titulo="No se pudieron cargar los costos" detalle={res.error} />
        )}
      </SeccionFicha>
    );
  }
  // Meta factura por número visible; `external_id` es el id del número y queda de respaldo.
  const numeros = numerosDeLaCuenta(ficha.consola.items, metaId).map((c) => c.display_phone_number ?? c.external_id);
  const todos = res.data.meta?.by_phone ?? [];
  const propios = costosDeLaCuenta(todos, numeros);
  // Si ningún número de la consola coincide (Meta aún no sincronizó el número visible), se muestra
  // el consumo de todo el negocio y se dice.
  const separado = propios.length > 0 || todos.length === 0;
  const porNumero = separado ? propios : todos;
  const total = porNumero.reduce((suma, r) => suma + r.cost, 0);
  const mensajes = porNumero.reduce((suma, r) => suma + r.volume, 0);
  const cuentas = creditosRes.ok ? creditosRes.data.connections.filter((c) => c.id === metaId) : [];

  return (
    <SeccionFicha
      titulo={porNumero.length > 0 ? `${formatUsd(total)} en 30 días` : "Costos"}
      descripcion={
        porNumero.length > 0
          ? `Lo que Meta cobró por ${formatNumber(mensajes)} mensajes de ${separado ? "esta cuenta" : "todo el negocio"} en los últimos 30 días.`
          : "Lo que Meta cobra por los mensajes de esta cuenta en los últimos 30 días."
      }
      acciones={
        esMaster ? (
          <Button asChild variant="ghost">
            <Link href="/costos">Costos técnicos del negocio</Link>
          </Button>
        ) : undefined
      }
    >
      {!separado && (
        <p className="text-sm text-text-soft">No pudimos separar los números de esta cuenta: se muestran los de todo el negocio.</p>
      )}
      <TablaResponsiva
        etiqueta="Costo por número"
        caption={separado ? "Costo de WhatsApp por número de la cuenta (30 días)" : "Costo de WhatsApp por número del negocio (30 días)"}
        columns={[
          { key: "numero", header: "Número", cell: (r) => <span className="tabular-nums text-headline">{r.phone_number}</span> },
          { key: "volumen", header: "Mensajes", align: "right", cell: (r) => <span className="tabular-nums text-body">{formatNumber(r.volume)}</span> },
          { key: "costo", header: "Costo", align: "right", cell: (r) => <span className="tabular-nums">{formatUsd(r.cost)}</span> },
        ]}
        rows={porNumero}
        getRowKey={(r, i) => `${r.phone_number}-${i}`}
        emptyTitle="Meta todavía no registra consumo"
        emptyDescription="Trae los costos de Meta para ver lo que cobró."
        filaCelular={(r) => ({ titulo: r.phone_number, detalle: `${formatNumber(r.volume)} mensajes`, fin: formatUsd(r.cost) })}
      />
      <MetaCosts connections={cuentas} />
    </SeccionFicha>
  );
}
