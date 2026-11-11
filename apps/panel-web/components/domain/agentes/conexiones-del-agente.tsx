import Link from "next/link";

import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Column } from "@/components/ui/data-table";
import { cuandoAtiende, type ConexionDelAgente } from "@/lib/agentes-ficha";

function Estado({ fila }: { fila: ConexionDelAgente }) {
  return fila.estado.tono === "neutral" ? (
    <Badge variant="neutral">{fila.estado.label}</Badge>
  ) : (
    <Badge variant={fila.estado.tono}>{fila.estado.label}</Badge>
  );
}

/**
 * Pestaña «Dónde atiende» de la ficha del agente (HU-UX-09, AGT-08): las conexiones donde está, de
 * la que atiende primero a las demás, y cada fila abre la ficha de la conexión. `asignarHref` lleva
 * al paso Publicar del editor (null si quien mira no puede editar).
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
        <span className="flex flex-col">
          <span className="font-medium text-headline">{f.label}</span>
          <span className="text-xs text-text-soft">{f.tipo}</span>
        </span>
      ),
    },
    {
      key: "cuando",
      header: "Cuándo atiende",
      info: "Con varios agentes en una conexión, el principal atiende primero y el Coordinador le pasa a cada uno lo de su tema.",
      cell: (f) => cuandoAtiende(f),
    },
    { key: "estado", header: "Estado", cell: (f) => <Estado fila={f} /> },
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
        <p role="status" className="text-sm text-text-soft">
          No pudimos ver cómo atiende en cada conexión. {respaldo.length > 0 ? "Estas son las conexiones donde está:" : ""}
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
          <TablaResponsiva
            etiqueta={`Conexiones donde atiende ${nombre}`}
            columns={columnas}
            rows={filas}
            getRowKey={(f) => f.id}
            getRowHref={(f) => `/conexiones/${f.id}`}
            getRowLabel={(f) => `Abrir la conexión ${f.label}`}
            caption={`Conexiones donde atiende ${nombre}`}
            filaCelular={(f) => ({
              titulo: f.label,
              detalle: `${f.tipo} · ${cuandoAtiende(f)}`,
              fin: <Estado fila={f} />,
              href: `/conexiones/${f.id}`,
            })}
          />
        )
      )}
    </section>
  );
}
