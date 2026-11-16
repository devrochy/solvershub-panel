import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { apiFetch } from "@/lib/api/server";
import { eventoLabel } from "@/lib/plantillas";
import { estadoDeCelda, avisosPorConexion, type MatrizPlantillas } from "@/lib/plantillas-negocio";

/**
 * Avisos por evento que no saldrán por una conexión activa porque su plantilla falta o no está aprobada en ella
 * (HU-CONN-21). Se muestra en Plantillas y en Avisos por evento; sin avisos así (o sin permiso) no muestra nada.
 * `matriz` evita pedirla dos veces cuando la página ya la cargó.
 */
export async function AvisosSinPlantillaPorConexion({ matriz, enlace = false }: { matriz?: MatrizPlantillas; enlace?: boolean }) {
  let datos = matriz;
  if (!datos) {
    const res = await apiFetch<MatrizPlantillas>("/admin/whatsapp-templates");
    if (!res.ok) return null;
    datos = res.data;
  }
  const grupos = avisosPorConexion(datos.avisos_faltantes, datos.conexiones);
  if (grupos.length === 0) return null;
  return (
    <div role="alert" className="flex gap-3 rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm">
      <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-fg" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="font-semibold text-headline">Hay avisos que no saldrán con plantilla por alguna de tus conexiones.</p>
        <ul className="flex flex-col gap-1 text-body">
          {grupos.map(({ conexion, avisos }) => (
            <li key={conexion.clave}>
              <span className="font-medium text-headline">{conexion.etiqueta}:</span>{" "}
              {avisos
                .map((a) => `${eventoLabel(a.evento)} (${a.nombre}, ${estadoDeCelda(a.estado).label.toLowerCase()})`)
                .join("; ")}
            </li>
          ))}
        </ul>
        {enlace && (
          <Link href="/plantillas" className="w-fit font-medium text-link underline underline-offset-2">
            Copiar las plantillas que faltan
          </Link>
        )}
      </div>
    </div>
  );
}
