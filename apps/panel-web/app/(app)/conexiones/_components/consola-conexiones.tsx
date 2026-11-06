import Link from "next/link";

import { PausarConexion } from "@/app/(app)/conexiones/_components/pausar-conexion";
import { ChannelIcon } from "@/components/domain/channel-icon";
import { Badge } from "@/components/ui/badge";
import type { ConnectionsConsole } from "@/lib/api/types";
import { estadoDeConexion, iconoDeConexion, muestraSalud, rutaDeFicha, tipoDeFicha, tipoLegible } from "@/lib/conexion-ficha";
import {
  etiquetaRuteo,
  puedePausar,
  resumenConsumo,
  saludDeConexion,
  textoConfirmarPausa,
  versionDeAgente,
  type ConexionConsola,
} from "@/lib/conexiones";

/**
 * Lista de conexiones (HU-AOS-23, compactada en HU-UX-09): una fila por conexión que abre su
 * ficha. Arriba, en una franja, el webhook del negocio, el enrutamiento y la consistencia.
 * Recibe los datos; no hace fetch.
 */
export function ConsolaConexiones({ consola, webhookUrl }: { consola: ConnectionsConsole; webhookUrl: string | null }) {
  return (
    <section aria-labelledby="consola-titulo" className="flex flex-col gap-4">
      <h2 id="consola-titulo" className="sr-only">
        Tus conexiones
      </h2>

      <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border-soft bg-surface px-4 py-3 text-xs text-body">
        {webhookUrl && (
          <div className="flex min-w-0 flex-wrap items-center gap-2" title="Regístralo en Meta con su verify token: sin esto los mensajes no llegan al asistente.">
            <dt className="font-medium text-headline">Webhook del negocio</dt>
            <dd className="min-w-0">
              <code className="break-all rounded bg-bg-deep px-2 py-0.5 font-mono text-link">{webhookUrl}</code>
            </dd>
          </div>
        )}
        <div className="flex items-center gap-2" title="Reparto entre especialistas (solo lo cambia el administrador)">
          <dt className="font-medium text-headline">Enrutamiento</dt>
          <dd>
            <Badge variant="neutral">{etiquetaRuteo(consola.routing)}</Badge>
          </dd>
        </div>
        {consola.consistency && (
          <div className="flex items-center gap-2" title="pass^k del último run de pruebas del negocio">
            <dt className="font-medium text-headline">Consistencia</dt>
            <dd>
              <Badge variant="accent">
                {consola.consistency.pass_k.toLocaleString("es-CO", { maximumFractionDigits: 2 })} en {consola.consistency.k}{" "}
                intentos
              </Badge>
            </dd>
          </div>
        )}
      </dl>

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
        <ul className="flex flex-col gap-2" aria-label="Conexiones del negocio">
          {consola.items.map((c) => (
            <li key={c.id}>
              <FilaConexion conexion={c} canEdit={consola.can_edit} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Una conexión: ícono, nombre (enlace a la ficha que cubre toda la fila), detalle, tipo, estado,
 * salud solo en las Meta, agentes con ★ en el principal y Pausar. Pausar queda por encima del
 * enlace para no anidar controles.
 */
function FilaConexion({ conexion: c, canEdit }: { conexion: ConexionConsola; canEdit: boolean }) {
  const tipo = tipoDeFicha(c);
  const estado = estadoDeConexion(c);
  const salud = saludDeConexion(c.health);
  const pausable = puedePausar(c, canEdit);

  return (
    <div className="relative grid items-center gap-x-4 gap-y-2 rounded-lg border border-border-soft bg-surface px-4 py-3 transition-colors focus-within:border-focus hover:border-focus/50 hover:bg-focus/5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)_6rem]">
      <div className="flex min-w-0 items-center gap-3">
        <ChannelIcon id={iconoDeConexion(c)} />
        <div className="flex min-w-0 flex-col">
          <Link
            href={rutaDeFicha(c)}
            className="truncate text-sm font-medium text-headline after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none"
          >
            {c.label}
          </Link>
          <span className="truncate font-mono text-xs text-text-soft">{c.external_id}</span>
        </div>
      </div>

      <span className="text-sm text-body">{tipoLegible(tipo)}</span>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={estado.tono}>{estado.label}</Badge>
        {muestraSalud(c) && salud.tono !== "neutral" && (
          <Badge variant={salud.tono} title="Salud de la cuenta de Meta">
            {salud.label}
          </Badge>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1 text-xs text-body">
        {c.conversational ? (
          <>
            <span className="truncate">
              {c.agents.length > 0
                ? c.agents
                    .map((a) => `${a.name}${a.is_default ? " ★" : ""} ${versionDeAgente(a)}${a.enabled ? "" : " (deshabilitado)"}`)
                    .join(" · ")
                : "Sin agentes"}
            </span>
            <span className="text-text-soft">
              {c.coordinator ? `Coordinador ${versionDeAgente(c.coordinator)}` : "Sin Coordinador todavía"} ·{" "}
              {c.active_release ? `Versión ${c.active_release.number}` : "Sin versión activa"}
              {c.canary_release ? ` · prueba v${c.canary_release.number}` : ""} · 7 días: {resumenConsumo(c.usage_7d)}
            </span>
          </>
        ) : (
          <span className="text-text-soft">Integración del negocio</span>
        )}
      </div>

      <div className="relative z-10 flex justify-end">
        {pausable && (
          <PausarConexion
            id={c.meta_connection_id ?? c.id}
            tipo={c.meta_connection_id ? "meta_connection" : "channel"}
            pausada={c.health === "paused"}
            textoConfirmacion={textoConfirmarPausa(c)}
          />
        )}
      </div>
    </div>
  );
}
