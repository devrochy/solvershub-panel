import { ConnectionActions } from "@/app/(app)/conexiones/_components/connection-actions";
import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/server";
import { estadoDeConexion } from "@/lib/conexion-ficha";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";
import { resumenConsumo } from "@/lib/conexiones";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Estado" };

type Estado = { status: string; risk_ok: boolean; jid: string | null; qr_image: string | null; last_error: string | null };

/** Estado de WhatsApp Web: la sesión del conector, el último error y el consumo de 7 días. */
export default async function EstadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await fichaDePestana(id, "estado");
  if (!ficha) return null;
  const c = ficha.conexion;
  const res = await apiFetch<Estado>("/admin/meta/waweb");
  const estado = estadoDeConexion(c);
  const sesion = res.ok ? res.data : null;

  return (
    <SeccionFicha titulo="Estado" descripcion="Cómo está la sesión de WhatsApp Web y qué ha atendido en los últimos 7 días.">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Sesión</CardTitle>
            <Badge variant={estado.tono}>{estado.label}</Badge>
            {sesion && <Badge variant={sesion.jid ? "success" : "warning"}>{sesion.status || "sin sesión"}</Badge>}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-body">
          {!res.ok && (
            <p role="alert" className="text-status-danger-fg">
              No se pudo leer la sesión del conector: {res.error}
            </p>
          )}
          <p>
            Número vinculado: <span className="font-mono text-xs text-headline">{sesion?.jid ?? c.external_id ?? "—"}</span>
          </p>
          <p>Último error: {sesion?.last_error ?? "ninguno"}</p>
          <p>Creada: {formatDateTime(c.created_at)}</p>
          <p>7 días: {resumenConsumo(c.usage_7d)}</p>
        </CardContent>
      </Card>
      {ficha.consola.can_edit && (
        <div>
          <ConnectionActions
            connectionId={c.id}
            label={c.label}
            active={c.active}
            primary={c.is_primary}
            kind="channel_connection"
            typeId={c.type_id}
            trigger="button"
          />
        </div>
      )}
    </SeccionFicha>
  );
}
