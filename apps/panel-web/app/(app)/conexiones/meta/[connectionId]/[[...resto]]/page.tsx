import { redirect } from "next/navigation";

import { conexionDeCuentaMeta, conQuery, destinoDeRutaMeta } from "@/lib/conexion-ficha";
import { cargarConsola } from "@/lib/conexion-ficha-servidor";

/**
 * Rutas viejas del hub de Meta (`/conexiones/meta/[metaId]/**`, HU-UX-09): llevan a la pestaña
 * equivalente de la ficha del número principal de esa cuenta, con la query (`?alta=1`). Siguen
 * vivas porque los enlaces que solo conocen la cuenta (checklist, plantillas, mensajes) pasan por aquí.
 * Sin números en la cuenta, a la lista.
 */
export default async function RutaMetaVieja({
  params,
  searchParams,
}: {
  params: Promise<{ connectionId: string; resto?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ connectionId, resto = [] }, query] = await Promise.all([params, searchParams]);
  const res = await cargarConsola();
  const conexion = res.ok ? conexionDeCuentaMeta(res.data.items, connectionId) : null;
  if (!conexion) redirect("/conexiones");
  redirect(conQuery(`/conexiones/${conexion.id}/${destinoDeRutaMeta(resto)}`, query));
}
