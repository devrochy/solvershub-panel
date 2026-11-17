import { redirect } from "next/navigation";

import { queryParaRedirigir, rutaDePersonalizar } from "@/lib/rutas-de-agente";

/** Ruta vieja del editor (HU-AOS-80): redirige a Personalizar conservando `?paso=` y `?modo=`. */
export default async function EditarAgenteRedirige({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  redirect(rutaDePersonalizar(id, queryParaRedirigir(await searchParams)));
}
