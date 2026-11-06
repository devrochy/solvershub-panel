import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import type { ConexionDelAgente } from "@/lib/agentes-ficha";

/**
 * Pestaña Conexiones de la ficha del agente (HU-UX-09, escenario «Agente → conexión»): dónde
 * atiende, con qué rol y prioridad y cuál es la principal; cada fila lleva a la ficha de la conexión.
 * `asignarHref` lleva al paso Publicar del editor (null si quien mira no puede editar).
 */
export function ConexionesDelAgente({
  filas,
  nombre,
  publicado,
  asignarHref,
  error,
  respaldo = [],
}: {
  filas: ConexionDelAgente[];
  nombre: string;
  publicado: boolean;
  asignarHref: string | null;
  /** La consola no respondió (p. ej. sin permiso de Conexiones): se dice y se listan las del resumen. */
  error?: string | null;
  respaldo?: { id: string; label: string }[];
}) {
  const asignar = asignarHref ? (
    <Button asChild variant={filas.length === 0 ? "accent" : "outline"}>
      <Link href={asignarHref}>Asignar a una conexión</Link>
    </Button>
  ) : null;

  const columnas: Column<ConexionDelAgente>[] = [
    {
      key: "conexion",
      header: "Conexión",
      cell: (f) => (
        <Link href={`/conexiones/${f.id}`} className="font-medium text-link hover:underline">
          {f.label}
        </Link>
      ),
    },
    { key: "tipo", header: "Tipo", cell: (f) => f.tipo },
    { key: "rol", header: "Rol", cell: (f) => f.rol },
    {
      key: "prioridad",
      header: "Prioridad",
      align: "right",
      info: "Con varios especialistas, el de menor número atiende primero lo que no tiene dueño claro.",
      cell: (f) => <span className="tabular-nums">{f.prioridad}</span>,
    },
    {
      key: "principal",
      header: "Principal",
      info: "El agente por defecto de la conexión: atiende cuando el Coordinador no elige a otro.",
      cell: (f) => (f.principal ? <Badge variant="accent">Sí</Badge> : <span className="text-text-soft">No</span>),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (f) => (
        <span className="inline-flex flex-wrap items-center gap-2">
          {f.estado.tono === "neutral" ? (
            <Badge variant="neutral">{f.estado.label}</Badge>
          ) : (
            <Badge variant={f.estado.tono}>{f.estado.label}</Badge>
          )}
          <span className="text-xs text-text-soft">{f.version ? `v${f.version} activa` : "Sin versión activa"}</span>
        </span>
      ),
    },
  ];

  return (
    <section aria-labelledby="conexiones-agente-titulo" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="conexiones-agente-titulo" className="font-display text-sh-block text-headline">
          Dónde atiende {nombre}
        </h2>
        {filas.length > 0 && asignar}
      </div>
      {error && (
        <p role="alert" className="text-sm text-status-danger-fg">
          No se pudo cargar el detalle de las conexiones (rol, prioridad y estado): {error}
        </p>
      )}
      {error && respaldo.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm" aria-label={`Conexiones de ${nombre}`}>
          {respaldo.map((c) => (
            <li key={c.id}>
              <Link href={`/conexiones/${c.id}`} className="text-link hover:underline">
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {filas.length === 0 && !(error && respaldo.length > 0) ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-md border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-fg"
        >
          <p>
            {publicado
              ? `${nombre} está publicado pero no está en ninguna conexión, así que no atiende a nadie.`
              : `${nombre} todavía no está en ninguna conexión.`}{" "}
            Un agente publicado necesita al menos una conexión para atender a tus clientes.
          </p>
          {asignar && <div>{asignar}</div>}
        </div>
      ) : (
        filas.length > 0 && (
          <DataTable columns={columnas} rows={filas} getRowKey={(f) => f.id} caption={`Conexiones donde atiende ${nombre}`} />
        )
      )}
    </section>
  );
}
