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

type Fila = { clave: string; ruta: string; celdas: Record<number, string>; tonos: Record<number, string>; titulos: Record<number, string> };

function tonoDe(falla: number, bloqueada: number, sinCorrer: number): string {
  if (falla > 0 || bloqueada > 0) return "bg-status-danger-bg text-status-danger-fg";
  if (sinCorrer > 0) return "bg-status-warning-bg text-status-warning-fg";
  return "bg-status-success-bg text-status-success-fg";
}

function celdaDe(ok: number, falla: number, bloqueada: number, sinCorrer: number, total: number) {
  const partes = [`OK ${ok}`, `Falla ${falla}`, `Bloqueada ${bloqueada}`, `Sin correr ${sinCorrer}`];
  return { texto: `${ok}/${total}`, tono: tonoDe(falla, bloqueada, sinCorrer), partes: partes.join(" · ") };
}

/**
 * Evolución por versión (HU-QA-08): una fila por subsección y una columna por versión del
 * catálogo, con el resultado consolidado del ciclo que usó cada una. Se lee de izquierda a
 * derecha: cómo avanza (o retrocede) cada parte del producto release a release.
 */
export function Evolucion({ versiones }: { versiones: QaVersionEvo[] }) {
  if (versiones.length === 0) return null;
  const filas: Fila[] = [];
  const porClave = new Map<string, Fila>();
  versiones.forEach((version, indice) => {    for (const seccion of version.secciones ?? []) {
      for (const area of seccion.areas ?? []) {
        for (const sub of area.subsecciones ?? []) {
          const ruta = `${ENTORNOS[seccion.entorno] ?? seccion.entorno} › ${area.area}${sub.subseccion ? ` › ${sub.subseccion}` : ""}`;
          const clave = `${seccion.entorno}\u0000${area.area}\u0000${sub.subseccion}`;
          let fila = porClave.get(clave);
          if (!fila) {
            fila = { clave, ruta, celdas: {}, tonos: {}, titulos: {} };
            porClave.set(clave, fila);
            filas.push(fila);
          }
          const celda = celdaDe(sub.ok, sub.falla, sub.bloqueada, sub.sin_correr, sub.total);
          fila.celdas[indice] = celda.texto;
          fila.tonos[indice] = celda.tono;
          fila.titulos[indice] = celda.partes;
        }
      }
    }
  });

  return (
    <section aria-label="Evolución por versión" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-display text-sh-block text-headline">Evolución por versión</h2>
        <p className="text-sm text-body">
          Cada columna es una versión del catálogo con lo que quedó en el ciclo que la usó: cómo avanza cada sección
          release a release.
        </p>
      </div>
      <div className="overflow-x-auto rounded-md border border-border-soft">
        <table className="w-full min-w-max text-sm">
          <caption className="sr-only">Resultado por subsección en cada versión del catálogo</caption>
          <thead>
            <tr className="border-b border-border-soft bg-surface-2 text-left">
              <th scope="col" className="sticky left-0 z-10 bg-surface-2 px-3 py-2 font-medium text-headline">
                Sección
              </th>
              {versiones.map((v) => (
                <th key={v.version} scope="col" className="min-w-44 px-3 py-2 text-right font-medium text-headline">
                  <span className="block">v{v.version}</span>
                  <span className="block text-xs font-normal text-text-soft">
                    {fechaDeCatalogo(v.fecha)}
                    {v.ciclo?.cerrado_en ? " · ciclo cerrado" : v.ciclo ? " · ciclo abierto" : " · sin ciclo"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.clave} className="border-b border-border-soft last:border-b-0">
                <th scope="row" className="sticky left-0 z-10 bg-surface px-3 py-2 text-left font-normal text-body">
                  {fila.ruta}
                </th>
                {versiones.map((v, i) => (
                  <td key={v.version} className="px-3 py-2 text-right">
                    <span
                      title={fila.titulos[i]}
                      className={cn("inline-block rounded-sm px-1.5 py-0.5 text-xs tabular-nums", fila.tonos[i] ?? "text-text-soft")}
                    >
                      {fila.celdas[i] ?? "—"}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={versiones.length + 1} className="px-3 py-6 text-center text-body">
                  Todavía no hay resultados por sección.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
