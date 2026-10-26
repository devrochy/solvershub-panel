import Link from "next/link";

import { GestionConexion } from "@/app/(app)/conexiones/_components/gestion-conexion";
import { PausarConexion } from "@/app/(app)/conexiones/_components/pausar-conexion";
import { ChannelBadge, ChannelIcon } from "@/components/domain/channel-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConnectionsConsole } from "@/lib/api/types";
import {
  esChatWeb,
  etiquetaRuteo,
  puedePausar,
  resumenConsumo,
  saludDeConexion,
  TEXTO_ALCANCE_PAUSA,
  textoConfirmarPausa,
  versionDeAgente,
  type ConexionConsola,
} from "@/lib/conexiones";

/** Consola de conexiones (HU-AOS-23, SPEC-26 §6.2 a). Recibe los datos; no hace fetch. */
export function ConsolaConexiones({ consola }: { consola: ConnectionsConsole }) {
  return (
    <section aria-labelledby="consola-titulo" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="consola-titulo" className="font-display text-lg font-semibold text-headline">
          Tus conexiones
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

      {consola.items.length === 0 ? (
        <p className="text-sm text-text-soft">Sin conexiones todavía.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {consola.items.map((c) => (
            <li key={c.id}>
              {c.conversational ? (
                <TarjetaConexion conexion={c} canEdit={consola.can_edit} />
              ) : (
                <TarjetaIntegracion conexion={c} canEdit={consola.can_edit} />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Integraciones (Google Calendar, etc.): compactas, sin agentes ni consumo. */
function TarjetaIntegracion({ conexion: c, canEdit }: { conexion: ConexionConsola; canEdit: boolean }) {
  const salud = saludDeConexion(c.health);
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <ChannelIcon id={c.type_id ?? c.channel} />
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium text-headline">{c.label}</span>
          <span className="truncate font-mono text-xs text-text-soft">{c.external_id}</span>
        </div>
        <Badge variant={salud.tono === "neutral" ? "neutral" : salud.tono} className="ml-auto">
          {salud.label}
        </Badge>
        <GestionConexion conexion={c} canEdit={canEdit} />
      </CardContent>
    </Card>
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
        {puedePausar(c, canEdit) && (
          <p className="text-xs text-text-soft sm:text-right">
            {TEXTO_ALCANCE_PAUSA}
            {esChatWeb(c) ? " Es el mismo interruptor de Configuración → Chat web." : ""}
          </p>
        )}
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
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <p className="text-xs text-body">7 días: {resumenConsumo(c.usage_7d)}</p>
          <div className="flex flex-wrap items-center gap-2">
            {/* HU-AOS-27: versiones de la conexión (diferencias, publicar, volver atrás). */}
            {c.conversational && (c.active_release || c.canary_release) && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/conexiones/${c.id}/versiones`}>Versiones</Link>
              </Button>
            )}
            <GestionConexion conexion={c} canEdit={canEdit} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
