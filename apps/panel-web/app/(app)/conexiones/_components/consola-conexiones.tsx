import { PausarConexion } from "@/app/(app)/conexiones/_components/pausar-conexion";
import { ChannelBadge } from "@/components/domain/channel-icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConnectionsConsole } from "@/lib/api/types";
import {
  etiquetaRuteo,
  puedePausar,
  resumenConsumo,
  saludDeConexion,
  separarConexiones,
  textoConfirmarPausa,
  versionDeAgente,
  type ConexionConsola,
} from "@/lib/conexiones";

/** Consola de conexiones (HU-AOS-23, SPEC-26 §6.2 a). Recibe los datos; no hace fetch. */
export function ConsolaConexiones({ consola }: { consola: ConnectionsConsole }) {
  const { canales, integraciones } = separarConexiones(consola.items);
  return (
    <section aria-labelledby="consola-titulo" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="consola-titulo" className="font-display text-lg font-semibold text-headline">
          Tus conexiones y sus agentes
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-xs text-body">
          <span title="Reparto entre especialistas (solo lo cambia el administrador)">
            Enrutamiento: <Badge variant="neutral">{etiquetaRuteo(consola.routing)}</Badge>
          </span>
          {consola.consistency && (
            <span title="pass^k del último run de pruebas del negocio">
              Consistencia del negocio:{" "}
              <Badge variant="accent">
                {consola.consistency.pass_k.toLocaleString("es-CO", { maximumFractionDigits: 2 })} en{" "}
                {consola.consistency.k} intentos
              </Badge>
            </span>
          )}
        </div>
      </div>

      {consola.unassigned_agents.length > 0 && (
        <p role="status" className="rounded-md bg-status-warning-bg px-3 py-2 text-sm text-status-warning-fg">
          Agentes publicados sin conexión: {consola.unassigned_agents.map((a) => a.name).join(", ")}. Un agente
          publicado tiene que estar en al menos una conexión para atender.
        </p>
      )}

      {consola.runtime === "legacy" && (
        <p className="text-xs text-text-soft">
          Este negocio todavía no usa el Agent OS: los agentes y las versiones se muestran, pero el consumo por
          conexión empieza a contarse al activarlo.
        </p>
      )}

      {canales.length === 0 ? (
        <p className="text-sm text-text-soft">Sin canales conectados todavía.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {canales.map((c) => (
            <li key={c.id}>
              <TarjetaConexion conexion={c} canEdit={consola.can_edit} />
            </li>
          ))}
        </ul>
      )}

      {integraciones.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <span className="text-body">Integraciones (todo el negocio)</span>
            {integraciones.map((i) => (
              <Badge key={i.id} variant={i.active ? "success" : "neutral"}>
                {i.label}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function TarjetaConexion({ conexion: c, canEdit }: { conexion: ConexionConsola; canEdit: boolean }) {
  const salud = saludDeConexion(c.health);
  return (
    <Card>
      <CardHeader className="gap-2 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex flex-wrap items-center gap-2">
            <ChannelBadge id={c.channel} />
            <span>{c.label}</span>
            <span className="font-mono text-xs font-normal text-body">{c.external_id}</span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {salud.tono === "neutral" ? (
              <Badge variant="neutral">{salud.label}</Badge>
            ) : (
              <Badge variant={salud.tono}>{salud.label}</Badge>
            )}
            <Badge variant="neutral">
              {c.active_release ? `Versión ${c.active_release.number}` : "Sin versión activa"}
            </Badge>
            {c.canary_release && <Badge variant="info">Prueba v{c.canary_release.number}</Badge>}
            {puedePausar(c, canEdit) && (
              <PausarConexion
                id={c.meta_connection_id ?? c.id}
                tipo={c.meta_connection_id ? "meta_connection" : "channel"}
                pausada={c.health === "paused"}
                textoConfirmacion={textoConfirmarPausa(c)}
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <p className="text-body">
          <span className="font-medium text-headline">Coordinador</span>{" "}
          {c.coordinator ? versionDeAgente(c.coordinator) : "sin Coordinador todavía"}
        </p>
        {c.agents.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label={`Agentes de ${c.label}`}>
            {c.agents.map((a) => (
              <li key={a.instance_id}>
                <Badge variant={a.enabled ? "accent" : "neutral"}>
                  {a.name}
                  {a.is_default ? " ★" : ""} · {versionDeAgente(a)}
                  {a.enabled ? "" : " · deshabilitado"}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-soft">Sin agentes en esta conexión.</p>
        )}
        <p className="text-xs text-body">7 días: {resumenConsumo(c.usage_7d)}</p>
        {c.pause_scope === "webchat_settings" && canEdit && (
          <p className="text-xs text-text-soft">El chat web se pausa desde Configuración → Chat web.</p>
        )}
      </CardContent>
    </Card>
  );
}
