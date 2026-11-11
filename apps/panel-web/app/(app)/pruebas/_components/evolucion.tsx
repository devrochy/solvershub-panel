import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { QaVersionEvo } from "@/lib/api/types";
import { fechaDeCatalogo } from "@/lib/qa/estados";
import { cn } from "@/lib/utils";

const ENTORNOS: Record<string, string> = {
  panel: "Panel",
  apk: "APK",
  whatsapp: "WhatsApp",
  web: "Web",
  api: "API",
  otros: "Sin clasificar",
};

type Celda = { ok: number; total: number; falla: number; bloqueada: number; sinCorrer: number };
type Fila = { clave: string; ruta: string; celdas: Record<number, Celda> };

function tonoDe(c: Celda): string {
  if (c.falla > 0 || c.bloqueada > 0) return "bg-status-danger-bg text-status-danger-fg";
  if (c.sinCorrer > 0) return "bg-status-warning-bg text-status-warning-fg";
  return "bg-status-success-bg text-status-success-fg";
}

/** Lo que pasó además de las aprobadas, en palabras: «1 falla», «2 sin correr». */
function detalleDe(c: Celda): string | null {
  const partes = [
    c.falla > 0 ? `${c.falla} ${c.falla === 1 ? "falla" : "fallas"}` : null,
    c.bloqueada > 0 ? `${c.bloqueada} ${c.bloqueada === 1 ? "bloqueada" : "bloqueadas"}` : null,
    c.sinCorrer > 0 ? `${c.sinCorrer} sin correr` : null,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(" · ") : null;
}

/** Tendencia entre las dos últimas versiones con dato de la fila (PRU-06). */
export function tendencia(celdas: (Celda | undefined)[]): string {
  const con = celdas.filter((c): c is Celda => !!c && c.total > 0);
  if (con.length < 2) return con.length === 1 ? "Nueva" : "—";
  const [antes, ahora] = con.slice(-2);
  const a = antes.ok / antes.total;
  const b = ahora.ok / ahora.total;
  if (ahora.falla + ahora.bloqueada > antes.falla + antes.bloqueada || b < a - 0.001) {
    return ahora.sinCorrer > 0 && ahora.falla + ahora.bloqueada === 0 ? "Falta correr" : "Empeoró";
  }
  if (b > a + 0.001) return "Mejoró";
  return "Igual";
}

/**
 * Cómo va cada sección (HU-QA-08, PRU-06): una fila por subsección y una columna por catálogo,
 * con las aprobadas de cada ciclo y la tendencia en palabras. El color acompaña al texto, nunca
 * va solo.
 */
export function Evolucion({ versiones }: { versiones: QaVersionEvo[] }) {
  if (versiones.length === 0) return null;
  const filas: Fila[] = [];
  const porClave = new Map<string, Fila>();
  versiones.forEach((version, indice) => {
    for (const seccion of version.secciones ?? []) {
      for (const area of seccion.areas ?? []) {
        for (const sub of area.subsecciones ?? []) {
          const ruta = `${ENTORNOS[seccion.entorno] ?? seccion.entorno} › ${area.area}${sub.subseccion ? ` › ${sub.subseccion}` : ""}`;
          const clave = `${seccion.entorno}\u0000${area.area}\u0000${sub.subseccion}`;
          let fila = porClave.get(clave);
          if (!fila) {
            fila = { clave, ruta, celdas: {} };
            porClave.set(clave, fila);
            filas.push(fila);
          }
          fila.celdas[indice] = { ok: sub.ok, total: sub.total, falla: sub.falla, bloqueada: sub.bloqueada, sinCorrer: sub.sin_correr };
        }
      }
    }
  });

  return (
    <section aria-labelledby="evolucion-titulo" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 id="evolucion-titulo" className="font-display text-sh-block text-headline">
          Cómo va cada sección
        </h2>
        <p className="text-sm text-body">
          Cada columna es el catálogo que usó un ciclo, con las pruebas aprobadas de las que tenía. En verde, todo bien; en
          amarillo, falta correr; en rojo, hay fallas o bloqueos.
        </p>
      </div>
      {filas.length === 0 ? (
        <p className="text-sm text-text-soft">Todavía no hay resultados por sección.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-soft">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="sticky left-0 z-10 bg-surface">
                  Sección
                </TableHead>
                {versiones.map((v) => (
                  <TableHead key={v.version} scope="col" className="min-w-36 text-right">
                    <span className="block normal-case tracking-normal">Catálogo del {fechaDeCatalogo(v.fecha)}</span>
                    <span className="block font-normal normal-case tracking-normal text-text-soft">
                      {v.ciclo?.cerrado_en ? "ciclo cerrado" : v.ciclo ? "ciclo abierto" : "sin ciclo"}
                    </span>
                  </TableHead>
                ))}
                <TableHead scope="col">Tendencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((fila) => (
                <TableRow key={fila.clave}>
                  <TableHead scope="row" className="sticky left-0 z-10 bg-surface text-sm font-normal normal-case tracking-normal text-body">
                    {fila.ruta}
                  </TableHead>
                  {versiones.map((v, i) => {
                    const c = fila.celdas[i];
                    const detalle = c ? detalleDe(c) : null;
                    return (
                      <TableCell key={v.version} className="text-right">
                        {c ? (
                          <span className={cn("inline-flex flex-col items-end rounded-sm px-2 py-1 text-xs tabular-nums", tonoDe(c))}>
                            <span className="font-medium">
                              {c.ok} de {c.total}
                            </span>
                            {detalle && <span>{detalle}</span>}
                          </span>
                        ) : (
                          <span className="text-text-soft">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-sm text-body">{tendencia(versiones.map((_, i) => fila.celdas[i]))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
