import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { apiFetch } from "@/lib/api/server";
import { formatNumber } from "@/lib/format";
import { totalDeMoneda, type CostosTwilio } from "@/lib/conexion-twilio";

/**
 * Costos de un número de WhatsApp vía Twilio (HU-CONN-13, ADR-0186 §11): lo que Twilio informó por los mensajes de
 * la conexión en 30 días, por moneda. Twilio no documenta si su precio incluye el cargo de Meta: la nota del
 * backend lo dice tal cual.
 */
export async function CostosTwilioSeccion({ connectionId }: { connectionId: string }) {
  const res = await apiFetch<CostosTwilio>(`/admin/connections/twilio/${encodeURIComponent(connectionId)}/costs?dias=30`);
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
  const { dias, por_moneda: filas, nota } = res.data;
  const mensajes = filas.reduce((suma, f) => suma + f.mensajes, 0);
  const titulo = filas.length === 1 ? `${totalDeMoneda(filas[0])} en ${dias} días` : "Costos";

  return (
    <SeccionFicha
      titulo={titulo}
      descripcion={
        filas.length > 0
          ? `Lo que Twilio cobró por ${formatNumber(mensajes)} mensajes de este número en los últimos ${dias} días.`
          : `Lo que Twilio cobra por los mensajes de este número en los últimos ${dias} días.`
      }
    >
      <p className="text-sm text-text-soft">{nota}</p>
      <TablaResponsiva
        etiqueta="Costo por moneda"
        caption={`Costo de WhatsApp vía Twilio por moneda (${dias} días)`}
        columns={[
          { key: "moneda", header: "Moneda", cell: (r) => <span className="text-headline">{r.moneda}</span> },
          { key: "mensajes", header: "Mensajes", align: "right", cell: (r) => <span className="tabular-nums text-body">{formatNumber(r.mensajes)}</span> },
          { key: "total", header: "Costo", align: "right", cell: (r) => <span className="tabular-nums">{totalDeMoneda(r)}</span> },
        ]}
        rows={filas}
        getRowKey={(r) => r.moneda}
        emptyTitle="Twilio todavía no informa costos"
        emptyDescription="Aparecen cuando los mensajes de este número terminan de entregarse."
        filaCelular={(r) => ({ titulo: r.moneda, detalle: `${formatNumber(r.mensajes)} mensajes`, fin: totalDeMoneda(r) })}
      />
    </SeccionFicha>
  );
}
