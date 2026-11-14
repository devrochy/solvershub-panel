import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { WawebPanel } from "@/app/(app)/conexiones/_components/waweb-panel";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/server";
import type { WawebState } from "@/lib/api/types";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";
import { actividadDeLaSemana } from "@/lib/conexiones";
import { formatFechaLarga } from "@/lib/format";

export const metadata = { title: "Estado" };

/**
 * WhatsApp con QR en una sola pestaña (CON-21): el vínculo con su QR o el número vinculado, el
 * aviso de que no es un canal oficial y lo que atendió en la semana.
 */
export default async function EstadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await fichaDePestana(id, "estado");
  if (!ficha) return null;
  const c = ficha.conexion;
  const res = await apiFetch<WawebState>("/admin/meta/waweb");

  return (
    <SeccionFicha titulo="Estado" descripcion="El vínculo con tu teléfono y lo que atendió en la semana.">
      {res.ok ? <WawebPanel initial={res.data} /> : <ErrorDeCarga titulo="No se pudo leer el vínculo con tu teléfono" detalle={res.error} />}
      <Card>
        <CardHeader>
          <CardTitle as="h3">Actividad</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
            <dt className="text-text-soft">Últimos 7 días</dt>
            <dd className="text-body">{actividadDeLaSemana(c.usage_7d)}</dd>
            <dt className="text-text-soft">Conectada desde</dt>
            <dd className="text-body">{formatFechaLarga(c.created_at)}</dd>
          </dl>
        </CardContent>
      </Card>
    </SeccionFicha>
  );
}
