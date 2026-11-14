import Link from "next/link";

import { MenuPausar } from "@/app/(app)/conexiones/_components/pausar-conexion";
import { ChannelIcon } from "@/components/domain/channel-icon";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { Badge } from "@/components/ui/badge";
import { type Column } from "@/components/ui/data-table";
import type { ConnectionsConsole } from "@/lib/api/types";
import { estadoDeConexion, iconoDeConexion, necesitaAtencion, rutaDeFicha, subtituloDeFicha, tipoDeFicha } from "@/lib/conexion-ficha";
import {
  actividadDeLaSemana,
  agentesDeLaConexion,
  puedePausar,
  textoConfirmarPausa,
  type ConexionConsola,
} from "@/lib/conexiones";

/**
 * Lista de conexiones (HU-AOS-23, rediseñada en CON-03): una tabla con un solo estado, quién
 * atiende y lo de la semana; la fila abre la ficha, donde están Pausar y el resto de acciones.
 * Arriba, lo que pide atención. Los datos técnicos del negocio (webhook, enrutamiento y
 * consistencia) solo los ve la plataforma. Recibe los datos; no hace fetch.
 */
export function ConsolaConexiones({
  consola,
  webhookUrl,
  esPlataforma = false,
}: {
  consola: ConnectionsConsole;
  webhookUrl: string | null;
  esPlataforma?: boolean;
}) {
  const atencion = consola.items.filter(necesitaAtencion);
  const menu = (c: ConexionConsola) =>
    puedePausar(c, consola.can_edit) ? (
      <MenuPausar
        nombre={c.label}
        id={c.meta_connection_id ?? c.id}
        tipo={c.meta_connection_id ? "meta_connection" : "channel"}
        pausada={c.health === "paused"}
        textoConfirmacion={textoConfirmarPausa(c)}
      />
    ) : null;

  const columns: Column<ConexionConsola>[] = [
    {
      key: "conexion",
      header: "Conexión",
      cell: (c) => (
        <div className="flex min-w-0 items-center gap-3">
          <ChannelIcon id={iconoDeConexion(c)} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-headline">{c.label}</span>
            <span className="truncate text-xs text-text-soft">{subtituloDeFicha(c, tipoDeFicha(c))}</span>
          </div>
        </div>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (c) => {
        const estado = estadoDeConexion(c);
        return <Badge variant={estado.tono}>{estado.label}</Badge>;
      },
    },
    { key: "agentes", header: "Agentes", cell: (c) => <span className="text-body">{agentesDeLaConexion(c)}</span> },
    {
      key: "semana",
      header: "Últimos 7 días",
      align: "right",
      className: "max-lg:hidden",
      cell: (c) => <span className="whitespace-nowrap text-body">{c.conversational ? actividadDeLaSemana(c.usage_7d) : "—"}</span>,
    },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      className: "w-10",
      cell: (c) => <div className="relative z-10 w-fit">{menu(c)}</div>,
    },
  ];

  return (
    <section aria-labelledby="consola-titulo" className="flex flex-col gap-4">
      <h2 id="consola-titulo" className="sr-only">
        Tus conexiones
      </h2>

      {atencion.map((c) => (
        <Link
          key={c.id}
          href={`${rutaDeFicha(c)}`}
          className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-headline transition-colors hover:bg-hover"
        >
          <span>
            <strong className="font-semibold">{c.label}</strong>{" "}
            {c.health === "error" ? "no está funcionando" : "tiene un aviso de Meta"}
          </span>
          <span className="font-medium text-link">Revisar ›</span>
        </Link>
      ))}

      {consola.unassigned_agents.length > 0 && (
        <Link
          href="/agentes"
          className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-headline transition-colors hover:bg-hover"
        >
          <span>
            {consola.unassigned_agents.length === 1 ? "Un agente publicado no atiende" : `${consola.unassigned_agents.length} agentes publicados no atienden`}{" "}
            en ninguna conexión: {consola.unassigned_agents.map((a) => a.name).join(", ")}.
          </span>
          <span className="font-medium text-link">Asignar ›</span>
        </Link>
      )}

      {esPlataforma && (
        <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border-soft bg-surface px-4 py-3 text-xs text-body">
          {webhookUrl && (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <dt className="font-medium text-headline">Webhook del negocio</dt>
              <dd className="min-w-0">
                <code className="break-all rounded bg-bg-deep px-2 py-0.5 font-mono text-link">{webhookUrl}</code>
              </dd>
            </div>
          )}
          {consola.consistency && (
            <div className="flex items-center gap-2">
              <dt className="font-medium text-headline">Consistencia</dt>
              <dd>
                <Badge variant="accent">
                  {consola.consistency.pass_k.toLocaleString("es-CO", { maximumFractionDigits: 2 })} en {consola.consistency.k} intentos
                </Badge>
              </dd>
            </div>
          )}
        </dl>
      )}

      <TablaResponsiva
        etiqueta="Conexiones del negocio"
        columns={columns}
        rows={consola.items}
        getRowKey={(c) => c.id}
        getRowHref={rutaDeFicha}
        getRowLabel={(c) => `Abrir ${c.label}`}
        emptyTitle="Conecta tu primer canal"
        emptyDescription="Tu agente empieza a atender cuando tiene por dónde hablar con tus clientes."
        filaCelular={(c) => {
          const estado = estadoDeConexion(c);
          return {
            inicio: <ChannelIcon id={iconoDeConexion(c)} />,
            titulo: c.label,
            detalle: `${estado.label} · ${c.conversational ? agentesDeLaConexion(c) : "Integración"}`,
            href: rutaDeFicha(c),
            accion: menu(c),
          };
        }}
      />
    </section>
  );
}
