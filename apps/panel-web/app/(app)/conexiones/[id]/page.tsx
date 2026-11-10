import { notFound, redirect } from "next/navigation";

import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { conQuery, pestanasDeFicha } from "@/lib/conexion-ficha";
import { cargarFicha } from "@/lib/conexion-ficha-servidor";

/**
 * `/conexiones/[id]` abre la primera pestaña de su tipo (HU-UX-09). La query se conserva: el alta
 * con Facebook vuelve con `?alta=1` y Google con `?google=…`.
 */
export default async function AbrirFicha({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const res = await cargarFicha(id);
  if (!res.ok) {
    return <ErrorDeCarga titulo="No se pudo abrir la conexión" detalle={res.error} />;
  }
  if (!res.ficha) notFound();
  redirect(conQuery(pestanasDeFicha(id, res.ficha.tipo)[0].href, query));
}
